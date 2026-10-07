package com.breadle.backend.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    String store(MultipartFile file, String directory);
    Resource load(String storedPath);
    void delete(String storedPath);
}
