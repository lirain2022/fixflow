package com.taskflow.fixflow;

import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import com.taskflow.entity.TicketStatus;

@Service @Transactional
public class AssetService {
    static final List<TicketStatus> UNFINISHED=List.of(TicketStatus.OPEN,TicketStatus.ASSIGNED,TicketStatus.IN_PROGRESS,TicketStatus.RESOLVED);
    private final AssetRepository assets;
    private final TicketRepository tickets;
    private final TicketService ticketService;
    private final AssetMaintenance maintenance;
    public AssetService(AssetRepository assets,TicketRepository tickets,TicketService ticketService,AssetMaintenance maintenance){this.assets=assets;this.tickets=tickets;this.ticketService=ticketService;this.maintenance=maintenance;}
    private void paging(int page,int size){if(page<0||size<1||size>100)throw new ApiException(400,"分頁條件不正確");}
    @Transactional(readOnly=true)
    public Map<String,Object> list(String query,boolean enabledOnly,int page,int size){
        paging(page,size);if(query.length()>200)throw new ApiException(400,"搜尋字串不可超過 200 字");
        Specification<Asset> spec=(root,q,cb)->{
            String value="%"+query.strip().toLowerCase(Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
            var matching=cb.or(cb.like(cb.lower(root.get("code")),value,'\\'),cb.like(cb.lower(root.get("name")),value,'\\'),cb.like(cb.lower(root.get("location")),value,'\\'));
            return enabledOnly?cb.and(matching,cb.isTrue(root.get("enabled"))):matching;
        };
        var result=assets.findAll(spec,PageRequest.of(page,size,Sort.by("code")));
        Set<Long> active=new HashSet<>();
        if(!result.isEmpty())active.addAll(tickets.activeAssetIds(result.getContent().stream().map(a->a.id).toList(),UNFINISHED));
        return Map.of("items",result.getContent().stream().map(a->view(a,active.contains(a.id))).toList(),"total",result.getTotalElements(),"page",page,"totalPages",result.getTotalPages());
    }
    @Transactional(readOnly=true)
    public Map<String,Object> get(Long id){Asset asset=assets.findById(id).orElseThrow(ApiException::missing);return view(asset,tickets.existsByAssetIdAndStatusIn(id,UNFINISHED));}
    public Map<String,Object> create(User actor,AssetInput input){Asset asset=new Asset();apply(asset,input);assets.saveAndFlush(asset);return view(asset,false);}
    public Map<String,Object> update(Long id,User actor,AssetInput input){
        Asset asset=assets.lockById(id).orElseThrow(ApiException::missing);
        if(input.version()==null||!input.version().equals(asset.version))throw new ApiException(409,"設備已被更新，請重新開啟編輯後再試");
        boolean active=tickets.existsByAssetIdAndStatusIn(id,UNFINISHED);
        if(!input.enabled()&&active)throw new ApiException(409,"設備仍有未結案工單，請先完成或取消工單再停用");
        apply(asset,input);assets.saveAndFlush(asset);return view(asset,active);
    }
    private void apply(Asset asset,AssetInput input){
        asset.code=input.code().toUpperCase(Locale.ROOT);asset.name=input.name().strip();asset.location=input.location().strip();asset.model=input.model()==null?"":input.model().strip();asset.category=input.category();asset.warrantyUntil=input.warrantyUntil();asset.enabled=input.enabled();asset.updatedAt=Instant.now();
    }
    @Transactional(readOnly=true)
    public Map<String,Object> history(Long id,User actor,int page,int size){
        paging(page,size);if(!assets.existsById(id))throw ApiException.missing();
        var spec=AssetMaintenance.visibleAsset(id,actor);
        var result=tickets.findAll(spec,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"id")));
        return Map.of("items",result.getContent().stream().map(ticketService::view).toList(),"total",result.getTotalElements(),"page",page,"totalPages",result.getTotalPages(),"maintenanceSummary",maintenance.summary(id,actor));
    }
    private Map<String,Object> view(Asset a,boolean active){
        Map<String,Object> m=new LinkedHashMap<>();m.put("id",a.id);m.put("version",a.version);m.put("code",a.code);m.put("name",a.name);m.put("location",a.location);m.put("model",a.model);m.put("category",a.category);m.put("warrantyUntil",a.warrantyUntil);m.put("enabled",a.enabled);m.put("status",!a.enabled?"RETIRED":active?"MAINTENANCE":"ACTIVE");m.put("createdAt",a.createdAt);m.put("updatedAt",a.updatedAt);return m;
    }
}
