package com.taskflow.fixflow;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;

public interface AssetRepository extends JpaRepository<Asset,Long>,JpaSpecificationExecutor<Asset> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from Asset a where a.id=:id")
    Optional<Asset> lockById(Long id);
}
