CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`senderId` int NOT NULL,
	`receiverId` int NOT NULL,
	`message` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(48) NOT NULL,
	`requestId` int,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`customerId` int NOT NULL,
	`technicianId` int NOT NULL,
	`amount` int NOT NULL,
	`method` enum('cash','card','wallet') NOT NULL,
	`status` enum('pending','authorized','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`transactionId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`technicianId` int NOT NULL,
	`score` double NOT NULL,
	`distanceKm` double NOT NULL,
	`etaMinutes` int NOT NULL,
	`estimatedPrice` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `request_matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `request_technician_match_unique` UNIQUE(`requestId`,`technicianId`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`technicianId` int NOT NULL,
	`requestId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`media` json,
	`visible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `service_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(48) NOT NULL,
	`basePriceMin` int NOT NULL,
	`basePriceMax` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`technicianId` int,
	`serviceId` int NOT NULL,
	`description` text NOT NULL,
	`media` json,
	`address` text NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`urgency` enum('standard','priority','emergency') NOT NULL DEFAULT 'standard',
	`status` enum('PENDING','TECHNICIAN_ASSIGNED','TECHNICIAN_ACCEPTED','ON_THE_WAY','ARRIVED','IN_PROGRESS','COMPLETED','PAID','REVIEWED','CANCELLED','DISPUTED') NOT NULL DEFAULT 'PENDING',
	`estimatedMin` int NOT NULL,
	`estimatedMax` int NOT NULL,
	`finalPrice` int,
	`scheduledAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`acceptedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `service_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `technician_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serviceIds` json NOT NULL,
	`verificationStatus` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`documents` json,
	`latitude` double,
	`longitude` double,
	`serviceRadiusKm` int NOT NULL DEFAULT 10,
	`availability` boolean NOT NULL DEFAULT false,
	`rating` double NOT NULL DEFAULT 0,
	`completedJobs` int NOT NULL DEFAULT 0,
	`hourlyRate` int NOT NULL,
	`bio` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technician_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `technician_profiles_user_id_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `profileImage` varchar(1024);--> statement-breakpoint
ALTER TABLE `users` ADD `addresses` json;--> statement-breakpoint
ALTER TABLE `users` ADD `accountRole` enum('customer','technician','admin') DEFAULT 'customer' NOT NULL;