package com.breadle.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReadingRewardLedgerRepository extends JpaRepository<ReadingRewardLedger, Long> {
    Optional<ReadingRewardLedger> findFirstBySessionIdAndRewardType(Long sessionId, String rewardType);
}
