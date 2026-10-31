package com.taskflow.fixflow;

import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.taskflow.fixflow.PartRequestService.Input;

/** One transaction for the report and its optional part requests. */
@Service
public class MemberReportService {
    public record ReportInput(
        @NotBlank @Size(max=120) String title,
        @NotBlank @Size(max=4000) String description,
        @NotBlank @Size(max=200) String location,
        @NotNull Category category,
        @NotNull Priority priority,
        @Positive Long assetId,
        @Size(max=10) List<@NotNull @Valid Input> partRequests
    ) {}

    private final MemberService members;
    private final PartRequestService parts;
    public MemberReportService(MemberService members,PartRequestService parts){this.members=members;this.parts=parts;}

    @Transactional
    public Map<String,Object> create(User actor,ReportInput input){
        var ticket=members.create(actor,new Requests.TicketInput(input.title(),input.description(),input.location(),input.category(),input.priority(),input.assetId(),null));
        Long id=((Number)ticket.get("id")).longValue();
        if(input.partRequests()!=null)for(var part:input.partRequests())parts.create(id,actor,part);
        return ticket;
    }
}
