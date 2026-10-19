package com.breadle.backend.repository;

import com.breadle.backend.entity.Livro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LivroRepository extends JpaRepository<Livro, Long> {

    List<Livro> findByAtivoTrueOrderByTituloAsc();
    Optional<Livro> findByArquivoUrl(String arquivoUrl);

    @Query("""
        select l from Livro l
        where l.ativo = true
          and (:q is null or :q = ''
               or lower(l.titulo) like lower(concat('%', :q, '%'))
               or lower(l.autor) like lower(concat('%', :q, '%')))
        """)
    Page<Livro> buscar(@Param("q") String q, Pageable pageable);
}