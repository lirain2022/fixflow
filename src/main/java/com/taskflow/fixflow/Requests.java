package com.taskflow.fixflow;
import jakarta.validation.constraints.*;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import com.taskflow.entity.TicketStatus;
public final class Requests {
    private Requests() {}
    public record Register(@NotBlank @Size(max=80) String name,@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(min=10,max=72) String password) { @Override public String toString(){return "Register[credentials redacted]";} }
    public record Login(@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(max=72) String password) { @Override public String toString(){return "Login[credentials redacted]";} }
    public record TicketInput(@NotBlank @Size(max=120) String title,@NotBlank @Size(max=4000) String description,@NotBlank @Size(max=200) String location,@NotNull Category category,@NotNull Priority priority,@Positive Long assetId,@PositiveOrZero Long version) {}
    public record PasswordChange(@NotBlank @Size(max=72) String currentPassword,@NotBlank @Size(min=10,max=72) String newPassword) { @Override public String toString(){return "PasswordChange[credentials redacted]";} }
    public record Assign(@NotNull @Positive Long technicianId, TicketStatus expectedStatus) {}
    public record AssetLink(@NotNull @Positive Long assetId,@NotNull @PositiveOrZero Long version) {}
    public record PreviousStep(@NotNull @PositiveOrZero Long version) {}
    public record Status(@NotNull TicketStatus status) {}
    public record Comment(@NotBlank @Size(max=4000) String content) {}
    public record Repair(@NotBlank @Size(max=4000) String description,
        @DecimalMin("0") @DecimalMax("1000.00") @Digits(integer=4,fraction=2) BigDecimal workHours,
        @DecimalMin("0") @DecimalMax("9999999.99") @Digits(integer=7,fraction=2) BigDecimal laborCost,
        @Valid @Size(max=50) List<@NotNull RepairPartInput> parts, @PositiveOrZero Long version) {}
    public record RepairDraft(@NotNull @Size(max=4000) String description,
        @NotNull @DecimalMin("0") @DecimalMax("1000.00") @Digits(integer=4,fraction=2) BigDecimal workHours,
        @NotNull @DecimalMin("0") @DecimalMax("9999999.99") @Digits(integer=7,fraction=2) BigDecimal laborCost,
        @NotNull @Valid @Size(max=50) List<@NotNull RepairPartInput> parts,@NotNull @PositiveOrZero Long version) {}
    public record RepairPartInput(@NotBlank @Size(max=120) String name,
        @NotNull @DecimalMin("1") @DecimalMax("999") @Digits(integer=3,fraction=0) BigDecimal quantity,
        @NotNull @DecimalMin("0") @DecimalMax("999999.99") @Digits(integer=6,fraction=2) BigDecimal unitPrice) {}
    public record Rework(@NotBlank @Size(max=4000) String reason) {}
    public record UserUpdate(@NotNull Boolean enabled) {}
    public record Staff(@NotBlank @Size(max=80) String name,@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(min=10,max=72) String password,@NotNull Role role) { @Override public String toString(){return "Staff[credentials redacted]";} }
}
