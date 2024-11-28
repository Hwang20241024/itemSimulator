-- CreateTable
CREATE TABLE `Accounts` (
    `accountsId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `refreshToken` TEXT NOT NULL,

    UNIQUE INDEX `Accounts_userName_key`(`userName`),
    PRIMARY KEY (`accountsId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Characters` (
    `characterId` INTEGER NOT NULL AUTO_INCREMENT,
    `accountsId` VARCHAR(191) NOT NULL,
    `charactersName` VARCHAR(191) NOT NULL,
    `money` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Characters_charactersName_key`(`charactersName`),
    UNIQUE INDEX `Characters_accountsId_charactersName_key`(`accountsId`, `charactersName`),
    PRIMARY KEY (`characterId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharactersStats` (
    `charactersStatsId` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `stats` JSON NOT NULL,

    UNIQUE INDEX `CharactersStats_characterId_key`(`characterId`),
    PRIMARY KEY (`charactersStatsId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Items` (
    `itemId` INTEGER NOT NULL AUTO_INCREMENT,
    `itemName` VARCHAR(191) NOT NULL,
    `price` INTEGER NULL,

    PRIMARY KEY (`itemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemStats` (
    `itemStatsId` INTEGER NOT NULL AUTO_INCREMENT,
    `itemId` INTEGER NOT NULL,
    `stats` JSON NOT NULL,

    UNIQUE INDEX `ItemStats_itemId_key`(`itemId`),
    PRIMARY KEY (`itemStatsId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharacterInventories` (
    `characterInventoriesId` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`characterInventoriesId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharacterEquippedItems` (
    `itemStatsId` INTEGER NOT NULL AUTO_INCREMENT,
    `characterInventoriesId` INTEGER NOT NULL,
    `characterId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,

    PRIMARY KEY (`itemStatsId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Characters` ADD CONSTRAINT `Characters_accountsId_fkey` FOREIGN KEY (`accountsId`) REFERENCES `Accounts`(`accountsId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharactersStats` ADD CONSTRAINT `CharactersStats_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Characters`(`characterId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemStats` ADD CONSTRAINT `ItemStats_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Items`(`itemId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterInventories` ADD CONSTRAINT `CharacterInventories_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Characters`(`characterId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterInventories` ADD CONSTRAINT `CharacterInventories_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Items`(`itemId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterEquippedItems` ADD CONSTRAINT `CharacterEquippedItems_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Characters`(`characterId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterEquippedItems` ADD CONSTRAINT `CharacterEquippedItems_characterInventoriesId_fkey` FOREIGN KEY (`characterInventoriesId`) REFERENCES `CharacterInventories`(`characterInventoriesId`) ON DELETE CASCADE ON UPDATE CASCADE;
