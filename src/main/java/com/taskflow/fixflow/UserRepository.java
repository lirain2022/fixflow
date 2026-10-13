package com.taskflow.fixflow;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
public interface UserRepository extends JpaRepository<User,Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select u from User u where u.id=:id") Optional<User> lockById(Long id);
    Optional<User> findByEmail(String email);
    List<User> findByRoleAndEnabledTrueOrderByName(Role role);
    List<User> findByEnabledTrueOrderByName();
}
