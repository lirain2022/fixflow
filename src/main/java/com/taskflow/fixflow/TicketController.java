package com.taskflow.fixflow;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import com.taskflow.entity.TicketStatus;
@RestController @RequestMapping("/api/tickets")
public class TicketController {
    private final TicketService tickets;private final AuthService auth;
    public TicketController(TicketService tickets,AuthService auth){this.tickets=tickets;this.auth=auth;}
    @GetMapping public Object list(Authentication a,@RequestParam(defaultValue="") String query,@RequestParam(required=false) TicketStatus status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="false") boolean overdue,@RequestParam(required=false) Priority priority,@RequestParam(required=false) Long assigneeId,@RequestParam(defaultValue="NEWEST") TicketOrder order,@RequestParam(defaultValue="ALL") TicketScope scope){return tickets.list(auth.current(a),query,status,page,size,overdue,priority,assigneeId,order,scope);}
    @GetMapping(value="/export",produces="text/csv;charset=UTF-8")
    public org.springframework.http.ResponseEntity<byte[]> export(Authentication a,@RequestParam(defaultValue="") String query,@RequestParam(required=false) TicketStatus status,@RequestParam(defaultValue="false") boolean overdue,@RequestParam(required=false) Priority priority,@RequestParam(required=false) Long assigneeId,@RequestParam(defaultValue="NEWEST") TicketOrder order,@RequestParam(defaultValue="ALL") TicketScope scope){
        byte[] csv=tickets.export(auth.current(a),query,status,overdue,priority,assigneeId,order,scope);
        String filename="fixflow-tickets-"+java.time.LocalDate.now(java.time.ZoneId.of("Asia/Taipei"))+".csv";
        return org.springframework.http.ResponseEntity.ok().header("Content-Disposition","attachment; filename=\""+filename+"\"").header("Cache-Control","private, no-store").body(csv);
    }
    @GetMapping("/{id}") public Object get(Authentication a,@PathVariable Long id){return tickets.get(id,auth.current(a));}
    @GetMapping("/unlinked-assets") public Object unlinkedAssets(Authentication a,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size){return tickets.unlinkedAssets(auth.current(a),query,page,size);}
    @PatchMapping("/{id}/asset") public Object linkAsset(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.AssetLink input){return tickets.linkAsset(id,auth.current(a),input);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication a,@Valid @RequestBody Requests.TicketInput input){return tickets.create(auth.current(a),input);}
    @PutMapping("/{id}") public Object edit(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.TicketInput input){return tickets.edit(id,auth.current(a),input);}
    @PatchMapping("/{id}/assign") public Object assign(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.Assign input){return tickets.assign(id,auth.current(a),input.technicianId(),input.expectedStatus());}
    @PostMapping("/{id}/previous-step") public Object previousStep(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.PreviousStep input){return tickets.previousStep(id,auth.current(a),input.version());}
    @PatchMapping("/{id}/status") public Object status(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.Status input){return tickets.status(id,auth.current(a),input.status());}
    @PostMapping("/{id}/comments") @ResponseStatus(HttpStatus.CREATED) public Object comment(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.Comment input){return tickets.comment(id,auth.current(a),input.content());}
    @PostMapping("/{id}/repair-records") @ResponseStatus(HttpStatus.CREATED) public Object repair(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.Repair input){return tickets.repair(id,auth.current(a),input);}
    @PutMapping("/{id}/repair-draft") public Object repairDraft(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.RepairDraft input){return tickets.saveRepairDraft(id,auth.current(a),input);}
    @PostMapping("/{id}/rework") public Object rework(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.Rework input){return tickets.rework(id,auth.current(a),input.reason());}
    @PostMapping("/{id}/cost-corrections") public Object correctCosts(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.CostCorrection input){return tickets.correctCosts(id,auth.current(a),input);}
}
