ALTER TABLE `receivables`
  ADD COLUMN `paymentMethod` ENUM('PIX', 'CASH', 'CARD') NOT NULL DEFAULT 'PIX',
  ADD COLUMN `notes` TEXT NULL;

UPDATE `receivables` r
INNER JOIN `sales` s ON s.`id` = r.`saleId`
SET r.`paymentMethod` = s.`paymentMethod`;
