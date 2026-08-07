ALTER TABLE usuarios
    ADD COLUMN remember_token VARCHAR(64) NULL,
    ADD COLUMN remember_expires DATETIME NULL;
