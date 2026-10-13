package com.taskflow.fixflow;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record AssetInput(
    @NotBlank @Size(max=40) @Pattern(regexp="[A-Za-z0-9][A-Za-z0-9_-]*") String code,
    @NotBlank @Size(max=120) String name,
    @NotBlank @Size(max=200) String location,
    @Size(max=120) String model,
    @NotNull Category category,
    LocalDate warrantyUntil,
    @NotNull Boolean enabled,
    @PositiveOrZero Long version
) {}
