package com.taskflow.fixflow;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

@RestController @RequestMapping("/api/assets")
public class AssetController {
    private final AssetService assets;private final AuthService auth;
    public AssetController(AssetService assets,AuthService auth){this.assets=assets;this.auth=auth;}
    @GetMapping public Object list(Authentication a,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="false") boolean enabledOnly,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){auth.current(a);return assets.list(query,enabledOnly,page,size);}
    @GetMapping("/{id}") public Object get(Authentication a,@PathVariable Long id){auth.current(a);return assets.get(id);}
    @GetMapping("/{id}/tickets") public Object history(Authentication a,@PathVariable Long id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size){return assets.history(id,auth.current(a),page,size);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication a,@Valid @RequestBody AssetInput input){return assets.create(auth.current(a),input);}
    @PutMapping("/{id}") public Object update(Authentication a,@PathVariable Long id,@Valid @RequestBody AssetInput input){return assets.update(id,auth.current(a),input);}
}
