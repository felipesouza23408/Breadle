package com.breadle.backend;

import com.breadle.backend.entity.Livro;
import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final LivroRepository livroRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(LivroRepository livroRepository,
                      UsuarioRepository usuarioRepository,
                      PasswordEncoder passwordEncoder) {
        this.livroRepository = livroRepository;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.findByEmail("admin@breadle.com").isEmpty()) {
            Usuario admin = new Usuario();
            admin.setNome("Admin Breadle");
            admin.setEmail("admin@breadle.com");
            admin.setSenhaHash(passwordEncoder.encode("admin123"));
            admin.setTipo(TipoUsuario.ADMINISTRADOR);
            admin.setAtivo(true);
            usuarioRepository.save(admin);
        }

        if (livroRepository.count() == 0) {
            Livro asterix = new Livro();
            asterix.setTitulo("Asterix e o Domínio dos Deuses");
            asterix.setAutor("René Goscinny");
            asterix.setSinopse("Uma aventura divertida com os amigos de Asterix em um enredo repleto de humor e História.");
            asterix.setOrigem("DOMINIO_PUBLICO");
            asterix.setTipo("GIBI");
            asterix.setPontuacaoBase(15);
            asterix.setTotalPaginas(72);
            asterix.setAtivo(true);
            livroRepository.save(asterix);

            Livro machado = new Livro();
            machado.setTitulo("Memórias Póstumas de Brás Cubas");
            machado.setAutor("Machado de Assis");
            machado.setSinopse("Uma obra clássica que explora memória, ironia e a sociedade brasileira do século XIX.");
            machado.setOrigem("DOMINIO_PUBLICO");
            machado.setTipo("LITERATURA");
            machado.setPontuacaoBase(30);
            machado.setTotalPaginas(220);
            machado.setAtivo(true);
            livroRepository.save(machado);
        }
    }
}
