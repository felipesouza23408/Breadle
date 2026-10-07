package com.breadle.backend.repository;

import com.breadle.backend.entity.Leitura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeituraRepository extends JpaRepository<Leitura, Long> {
    List<Leitura> findByLeitorIdOrderByIdDesc(Long leitorId);
}
