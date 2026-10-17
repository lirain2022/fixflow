package com.taskflow.fixflow;

import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/costs")
public class CostReportController {
    private final CostReportService costs;
    private final AuthService auth;
    public CostReportController(CostReportService costs,AuthService auth){this.costs=costs;this.auth=auth;}
    @GetMapping("/people") public Object people(Authentication a){return costs.people(auth.current(a));}
    @GetMapping public Object report(Authentication a,
        @RequestParam(defaultValue="RECORDED") CostReportService.Mode mode,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue="") String equipment,@RequestParam(required=false) Long assigneeId,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size){
        return costs.report(auth.current(a),mode,from,to,equipment,assigneeId,page,size);
    }
    @GetMapping(value="/export",produces="text/csv;charset=UTF-8") public ResponseEntity<byte[]> export(Authentication a,
        @RequestParam(defaultValue="RECORDED") CostReportService.Mode mode,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue="") String equipment,@RequestParam(required=false) Long assigneeId){
        return ResponseEntity.ok().header("Content-Disposition","attachment; filename=\"fixflow-costs.csv\"").header("Cache-Control","private, no-store").body(costs.export(auth.current(a),mode,from,to,equipment,assigneeId));
    }
}
