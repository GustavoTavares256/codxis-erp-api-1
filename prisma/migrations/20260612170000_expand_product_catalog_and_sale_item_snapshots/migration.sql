ALTER TABLE `products`
  ADD COLUMN `code` VARCHAR(191) NULL,
  ADD COLUMN `salePackage` VARCHAR(191) NULL,
  ADD COLUMN `salePackageQuantity` DECIMAL(10, 3) NULL,
  ADD COLUMN `purchasePrice` DECIMAL(10, 2) NULL,
  ADD COLUMN `markupPercent` DECIMAL(10, 2) NULL,
  ADD COLUMN `profitMarginPercent` DECIMAL(10, 2) NULL,
  ADD COLUMN `taxableBarcode` VARCHAR(191) NULL,
  ADD COLUMN `captureWeightOnScale` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `expirationDate` DATETIME(3) NULL,
  ADD COLUMN `commissionPercent` DECIMAL(10, 2) NULL,
  ADD COLUMN `factoryReference` VARCHAR(191) NULL,
  ADD COLUMN `grossWeightKg` DECIMAL(10, 3) NULL,
  ADD COLUMN `netWeightKg` DECIMAL(10, 3) NULL,
  ADD COLUMN `lengthCm` DECIMAL(10, 2) NULL,
  ADD COLUMN `widthCm` DECIMAL(10, 2) NULL,
  ADD COLUMN `heightCm` DECIMAL(10, 2) NULL,
  ADD COLUMN `brand` VARCHAR(191) NULL,
  ADD COLUMN `supplierPackage` VARCHAR(191) NULL,
  ADD COLUMN `supplierPackageQuantity` DECIMAL(10, 3) NULL,
  ADD COLUMN `sizeColorGrid` TEXT NULL,
  ADD COLUMN `imageUrl` LONGTEXT NULL;

CREATE INDEX `products_code_idx` ON `products`(`code`);

ALTER TABLE `sale_items`
  ADD COLUMN `unit` ENUM('UN', 'CX', 'PC', 'KG', 'G', 'TON', 'L', 'ML', 'M', 'CM', 'M2', 'M3', 'SC', 'FD') NOT NULL DEFAULT 'UN',
  ADD COLUMN `productName` VARCHAR(191) NULL,
  ADD COLUMN `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0;

UPDATE `sale_items` AS `saleItem`
INNER JOIN `products` AS `product` ON `product`.`id` = `saleItem`.`productId`
SET
  `saleItem`.`productName` = `product`.`name`,
  `saleItem`.`unit` = `product`.`unit`;

UPDATE `sale_items`
SET `productName` = 'Produto'
WHERE `productName` IS NULL OR `productName` = '';

ALTER TABLE `sale_items`
  MODIFY COLUMN `productName` VARCHAR(191) NOT NULL;
