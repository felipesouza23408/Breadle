package com.breadle.backend.service.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {

    private final Path storageRoot;

    public LocalFileStorageService(@Value("${breadle.storage.local-path:./storage}") String rootPath) {
        this.storageRoot = Paths.get(rootPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Não foi possível criar a pasta de armazenamento local.", e);
        }
    }

    @Override
    public String store(MultipartFile file, String directory) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio.");
        }

        try {
            Path targetDir = storageRoot.resolve(directory == null || directory.isBlank() ? "" : directory).normalize();
            Files.createDirectories(targetDir);

            String originalName = file.getOriginalFilename();
            String extension = "";
            int dotIndex = originalName == null ? -1 : originalName.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < originalName.length() - 1) {
                extension = originalName.substring(dotIndex);
            }

            String savedName = UUID.randomUUID() + extension;
            Path destination = targetDir.resolve(savedName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            return directory + "/" + savedName;
        } catch (IOException e) {
            throw new IllegalStateException("Erro ao salvar o arquivo localmente.", e);
        }
    }

    @Override
    public Resource load(String storedPath) {
        try {
            Path file = storageRoot.resolve(storedPath.replace("\\", "/").replaceFirst("^/", "")).normalize();
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new IllegalArgumentException("Arquivo não encontrado: " + storedPath);
        } catch (Exception e) {
            throw new IllegalStateException("Erro ao carregar o arquivo armazenado.", e);
        }
    }

    @Override
    public void delete(String storedPath) {
        try {
            Path file = storageRoot.resolve(storedPath.replace("\\", "/").replaceFirst("^/", "")).normalize();
            Files.deleteIfExists(file);
        } catch (IOException e) {
            throw new IllegalStateException("Erro ao remover o arquivo armazenado.", e);
        }
    }
}
