SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `ai_cv_analyses`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `conversations`;
DROP TABLE IF EXISTS `saved_jobs`;
DROP TABLE IF EXISTS `applications`;
DROP TABLE IF EXISTS `job_skills`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `candidate_skills`;
DROP TABLE IF EXISTS `skills`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `companies`;
DROP TABLE IF EXISTS `candidate_profiles`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `failed_jobs`;
DROP TABLE IF EXISTS `job_batches`;
DROP TABLE IF EXISTS `queue_jobs`;
DROP TABLE IF EXISTS `cache_locks`;
DROP TABLE IF EXISTS `cache`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `personal_access_tokens`;
DROP TABLE IF EXISTS `users`;

DROP TABLE IF EXISTS `conversation`;
DROP TABLE IF EXISTS `user_skills`;
DROP TABLE IF EXISTS `types`;
DROP TABLE IF EXISTS `status`;
DROP TABLE IF EXISTS `role`;
DROP TABLE IF EXISTS `user`;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `dob` DATE DEFAULT NULL COMMENT 'Ngày tháng năm sinh (yêu cầu từ 15 tuổi trở lên theo SRS 2.2)',
  `role` ENUM('candidate', 'employer', 'admin') NOT NULL DEFAULT 'candidate',
  `status` ENUM('active', 'locked') NOT NULL DEFAULT 'active',
  `failed_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` TIMESTAMP NULL DEFAULT NULL,
  `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `remember_token` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_status_idx` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. BẢNG `candidate_profiles` (Hồ sơ cá nhân của Ứng viên)
-- --------------------------------------------------------
CREATE TABLE `candidate_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(100) DEFAULT NULL COMMENT 'Chức danh công việc mong muốn',
  `experience_years` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số năm kinh nghiệm',
  `bio` TEXT DEFAULT NULL COMMENT 'Giới thiệu bản thân',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `cv_file_path` VARCHAR(255) DEFAULT NULL COMMENT 'Đường dẫn file CV PDF mặc định',
  `social_links` JSON DEFAULT NULL COMMENT 'Liên kết mạng xã hội / portfolio (LinkedIn, GitHub, Portfolio...)',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_profiles_user_id_unique` (`user_id`),
  CONSTRAINT `fk_candidate_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. BẢNG `companies` (Hồ sơ Doanh nghiệp / Nhà tuyển dụng)
-- --------------------------------------------------------
CREATE TABLE `companies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `logo` VARCHAR(255) DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `company_size` VARCHAR(50) DEFAULT NULL COMMENT 'Quy mô nhân sự (ví dụ: 50-100 nhân viên)',
  `address` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `companies_user_id_unique` (`user_id`),
  CONSTRAINT `fk_company_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. BẢNG `categories` (Danh mục ngành nghề)
-- --------------------------------------------------------
CREATE TABLE `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. BẢNG `skills` (Danh mục kỹ năng chuyên môn)
-- --------------------------------------------------------
CREATE TABLE `skills` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `skills_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. BẢNG `candidate_skills` (Kỹ năng của Ứng viên - N:N Pivot)
-- --------------------------------------------------------
CREATE TABLE `candidate_skills` (
  `candidate_id` BIGINT UNSIGNED NOT NULL,
  `skill_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`candidate_id`, `skill_id`),
  CONSTRAINT `fk_cand_skills_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidate_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cand_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. BẢNG `jobs` (Tin tuyển dụng)
-- --------------------------------------------------------
CREATE TABLE `jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT UNSIGNED NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `job_level` VARCHAR(50) DEFAULT NULL COMMENT 'Cấp bậc (Intern, Fresher, Junior, Middle, Senior, Lead...)',
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Số lượng cần tuyển',
  `description` TEXT NOT NULL COMMENT 'Mô tả công việc (JD)',
  `requirements` TEXT NOT NULL COMMENT 'Yêu cầu chuyên môn',
  `benefits` TEXT NOT NULL COMMENT 'Quyền lợi & đãi ngộ',
  `salary_min` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Lương tối thiểu (VNĐ)',
  `salary_max` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Lương tối đa (VNĐ)',
  `is_negotiable` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1: Lương thỏa thuận, 0: Khoảng lương cụ thể',
  `job_type` ENUM('full_time', 'part_time', 'remote', 'internship') NOT NULL DEFAULT 'full_time',
  `city` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL COMMENT 'Địa điểm làm việc chi tiết',
  `deadline` DATE NOT NULL COMMENT 'Hạn chót nộp hồ sơ',
  `status` ENUM('active', 'closed', 'expired') NOT NULL DEFAULT 'active',
  `is_reported` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1: Bị báo cáo vi phạm, 0: Bình thường',
  `rejection_reason` VARCHAR(255) DEFAULT NULL COMMENT 'Lý do xóa hoặc cảnh báo từ Admin',
  `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm đăng tin tuyển dụng',
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm đẩy tin (bump_at): Tự động reset thời gian khi có ứng viên nộp hồ sơ (apply) hoặc NTD chỉnh sửa tin để đẩy bài lên đầu',
  PRIMARY KEY (`id`),
  KEY `jobs_filter_idx` (`status`, `city`, `salary_min`, `salary_max`, `deadline`),
  KEY `jobs_updated_at_idx` (`updated_at`),
  KEY `jobs_company_idx` (`company_id`),
  KEY `jobs_category_idx` (`category_id`),
  KEY `jobs_reported_idx` (`is_reported`),
  CONSTRAINT `fk_jobs_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jobs_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. BẢNG `job_skills` (Kỹ năng yêu cầu của Công việc - N:N Pivot)
-- Bảng trung gian thuần túy: KHÔNG CẦN id, created_at, updated_at
-- --------------------------------------------------------
CREATE TABLE `job_skills` (
  `job_id` BIGINT UNSIGNED NOT NULL,
  `skill_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`job_id`, `skill_id`),
  CONSTRAINT `fk_job_skills_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. BẢNG `saved_jobs` (Việc làm đã lưu của Ứng viên)
-- Chỉ cần created_at: Lưu lúc nào để sắp xếp mới nhất lên đầu. Không sửa đổi nên KHÔNG CẦN updated_at
-- --------------------------------------------------------
CREATE TABLE `saved_jobs` (
  `candidate_id` BIGINT UNSIGNED NOT NULL,
  `job_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm lưu việc làm',
  PRIMARY KEY (`candidate_id`, `job_id`),
  CONSTRAINT `fk_saved_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidate_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_saved_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. BẢNG `applications` (Hồ sơ ứng tuyển)
-- Cần cả created_at (ngày nộp) & updated_at (ngày NTD cập nhật trạng thái xét duyệt)
-- --------------------------------------------------------
CREATE TABLE `applications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id` BIGINT UNSIGNED NOT NULL,
  `candidate_id` BIGINT UNSIGNED NOT NULL,
  `cv_path` VARCHAR(255) NOT NULL COMMENT 'Đường dẫn file CV PDF nộp cho đơn này',
  `cover_letter` TEXT DEFAULT NULL COMMENT 'Thư giới thiệu',
  `status` ENUM('applied', 'waiting', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'applied' COMMENT 'applied: Đã ứng tuyển, waiting: Đang xem xét, accepted: Trúng tuyển, rejected: Từ chối, withdrawn: Đã rút đơn',
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Thời điểm Nhà tuyển dụng mở xem CV lần đầu (chuyển sang waiting)',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm nộp hồ sơ',
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm thay đổi trạng thái xét duyệt',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_job_application` (`job_id`, `candidate_id`),
  KEY `applications_status_idx` (`status`),
  CONSTRAINT `fk_apps_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_apps_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidate_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. BẢNG `ai_cv_analyses` (Kết quả Gemini AI phân tích CV)
-- Chỉ cần created_at (thời điểm AI phân tích xong, lưu vĩnh viễn theo FR-07.5). KHÔNG CẦN updated_at
-- --------------------------------------------------------
CREATE TABLE `ai_cv_analyses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `application_id` BIGINT UNSIGNED NOT NULL,
  `match_score` TINYINT UNSIGNED NOT NULL COMMENT 'Điểm tương đồng từ 0 đến 100',
  `summary` TEXT NOT NULL COMMENT 'Tóm tắt đánh giá tổng quan của AI (dưới 80 từ)',
  `matched_skills` JSON NOT NULL COMMENT 'Mảng kỹ năng ứng viên đáp ứng đúng yêu cầu',
  `missing_skills` JSON NOT NULL COMMENT 'Mảng 1-4 kỹ năng JD yêu cầu mà CV còn thiếu',
  `strengths` JSON NOT NULL COMMENT 'Điểm mạnh nổi bật của ứng viên (2-4 điểm)',
  `recommendations` JSON DEFAULT NULL COMMENT 'Gợi ý / Lời khuyên cải thiện hồ sơ',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm phân tích và lưu vĩnh viễn',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_cv_analyses_application_id_unique` (`application_id`),
  CONSTRAINT `fk_ai_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. BẢNG `conversations` (Cuộc trò chuyện giữa Ứng viên & Nhà tuyển dụng)
-- Cần created_at và last_message_at (để sắp xếp theo tin mới nhất). KHÔNG CẦN updated_at
-- --------------------------------------------------------
CREATE TABLE `conversations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `candidate_id` BIGINT UNSIGNED NOT NULL COMMENT 'User ID của ứng viên',
  `employer_id` BIGINT UNSIGNED NOT NULL COMMENT 'User ID của nhà tuyển dụng',
  `job_id` BIGINT UNSIGNED NOT NULL COMMENT 'Công việc liên quan',
  `last_message_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Thời gian gửi tin nhắn mới nhất',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_conversation` (`candidate_id`, `employer_id`, `job_id`),
  CONSTRAINT `fk_conv_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_employer` FOREIGN KEY (`employer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13. BẢNG `messages` (Tin nhắn thời gian thực qua WebSocket)
-- Chỉ cần created_at (thời điểm gửi tin nhắn HH:mm). Tin nhắn không bị sửa nên KHÔNG CẦN updated_at
-- --------------------------------------------------------
CREATE TABLE `messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT UNSIGNED NOT NULL,
  `sender_id` BIGINT UNSIGNED NOT NULL COMMENT 'User ID người gửi',
  `message` TEXT NOT NULL COMMENT 'Nội dung tin nhắn (1 đến 1000 ký tự)',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0: Chưa xem, 1: Đã xem',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian gửi tin nhắn',
  PRIMARY KEY (`id`),
  KEY `messages_conversation_idx` (`conversation_id`),
  CONSTRAINT `fk_msg_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 14. BẢNG `notifications` (Hệ thống chuông thông báo In-App)
-- Cần created_at và read_at (đánh dấu đã đọc). Không sửa nội dung thông báo nên KHÔNG CẦN updated_at
-- --------------------------------------------------------
CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL COMMENT 'Ví dụ: app_status_changed, new_applicant, new_message',
  `data` JSON DEFAULT NULL COMMENT 'Dữ liệu đính kèm (job_id, application_id...)',
  `read_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Thời điểm xem thông báo (NULL: Chưa đọc)',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo thông báo',
  PRIMARY KEY (`id`),
  KEY `notifications_user_read_idx` (`user_id`, `read_at`),
  CONSTRAINT `fk_notify_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 15. BẢNG PHỤ TRỢ LARAVEL SANCTUM & PASSWORD RESETS
-- --------------------------------------------------------
CREATE TABLE `personal_access_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` VARCHAR(255) NOT NULL,
  `tokenable_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `token` VARCHAR(64) NOT NULL,
  `abilities` TEXT DEFAULT NULL,
  `last_used_at` TIMESTAMP NULL DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`, `tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
  `email` VARCHAR(100) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- CÁC BẢNG HỆ THỐNG LARAVEL (Sessions, Cache, Queue)
-- --------------------------------------------------------
CREATE TABLE `sessions` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` BIGINT UNSIGNED DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `payload` LONGTEXT NOT NULL,
  `last_activity` INT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache` (
  `key` VARCHAR(255) NOT NULL,
  `value` MEDIUMTEXT NOT NULL,
  `expiration` INT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache_locks` (
  `key` VARCHAR(255) NOT NULL,
  `owner` VARCHAR(255) NOT NULL,
  `expiration` INT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `queue_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `queue` VARCHAR(255) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `attempts` TINYINT UNSIGNED NOT NULL,
  `reserved_at` INT UNSIGNED DEFAULT NULL,
  `available_at` INT UNSIGNED NOT NULL,
  `created_at` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `queue_jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_batches` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `total_jobs` INT NOT NULL,
  `pending_jobs` INT NOT NULL,
  `failed_jobs` INT NOT NULL,
  `failed_job_ids` LONGTEXT NOT NULL,
  `options` MEDIUMTEXT DEFAULT NULL,
  `cancelled_at` INT DEFAULT NULL,
  `created_at` INT NOT NULL,
  `finished_at` INT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `failed_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(255) NOT NULL,
  `connection` TEXT NOT NULL,
  `queue` TEXT NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `exception` LONGTEXT NOT NULL,
  `failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- DỮ LIỆU KHỞI TẠO BAN ĐẦU
-- Mật khẩu mặc định cho các tài khoản test: Password123@
-- Hash bcrypt: $2y$12$STO/zlCBm59OdpBAf7RxxekCuzOYssSZAj09mP.KgeRk9L2S8aXuy
-- ====================================================================

-- 1. Tài khoản Test cho 3 Role
INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone`, `dob`, `role`, `status`) VALUES
(1, 'Quản Trị Viên', 'admin@timviec.vn', '$2y$12$STO/zlCBm59OdpBAf7RxxekCuzOYssSZAj09mP.KgeRk9L2S8aXuy', '0901234567', '1995-05-15', 'admin', 'active'),
(2, 'Công Ty Công Nghệ FPT', 'employer@timviec.vn', '$2y$12$STO/zlCBm59OdpBAf7RxxekCuzOYssSZAj09mP.KgeRk9L2S8aXuy', '0912345678', NULL, 'employer', 'active'),
(3, 'Nguyễn Văn Ứng Viên', 'candidate@timviec.vn', '$2y$12$STO/zlCBm59OdpBAf7RxxekCuzOYssSZAj09mP.KgeRk9L2S8aXuy', '0987654321', '2002-10-20', 'candidate', 'active');

-- 2. Hồ sơ tương ứng
INSERT INTO `candidate_profiles` (`id`, `user_id`, `title`, `experience_years`, `bio`, `city`) VALUES
(1, 3, 'Lập Trình Viên Fullstack Laravel & React', 2, 'Kỹ sư phần mềm có 2 năm kinh nghiệm thực chiến phát triển ứng dụng web hiện đại.', 'Hà Nội');

INSERT INTO `companies` (`id`, `user_id`, `name`, `company_size`, `website`, `address`, `city`, `description`) VALUES
(1, 2, 'FPT Software', '1000+ nhân viên', 'https://fptsoftware.com', 'Khu Công Nghệ Cao Hòa Lạc', 'Hà Nội', 'Tập đoàn công nghệ và chuyển đổi số hàng đầu Việt Nam.');

-- 3. Danh mục ngành nghề
INSERT INTO `categories` (`id`, `name`) VALUES
(1, 'Công nghệ thông tin / Phần mềm'),
(2, 'Marketing & Truyền thông số'),
(3, 'Kế toán & Tài chính doanh nghiệp'),
(4, 'Thiết kế đồ họa & UI/UX'),
(5, 'Quản trị nhân sự & Hành chính');

-- 4. Kỹ năng chuyên môn
INSERT INTO `skills` (`id`, `name`) VALUES
(1, 'PHP'),
(2, 'Laravel'),
(3, 'ReactJS'),
(4, 'NextJS'),
(5, 'TypeScript'),
(6, 'MySQL'),
(7, 'RESTful API'),
(8, 'Docker'),
(9, 'Figma / UI Design'),
(10, 'SEO & Content');

-- 5. Kỹ năng của Ứng viên mẫu
INSERT INTO `candidate_skills` (`candidate_id`, `skill_id`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 6),
(1, 7);

-- 6. Việc làm mẫu
INSERT INTO `jobs` (`id`, `company_id`, `category_id`, `title`, `job_level`, `quantity`, `description`, `requirements`, `benefits`, `salary_min`, `salary_max`, `is_negotiable`, `job_type`, `city`, `address`, `deadline`, `status`) VALUES
(1, 1, 1, 'Lập Trình Viên Backend Laravel (Middle)', 'Middle', 2,
'Phát triển và bảo trì hệ thống RESTful API cho sản phẩm quản lý tuyển dụng. Phối hợp với đội Frontend Next.js và tích hợp AI.',
'- Tối thiểu 2 năm kinh nghiệm làm việc với Laravel 10/11.\n- Thành thạo MySQL, Redis và thiết kế cơ sở dữ liệu.\n- Có hiểu biết về WebSocket (Laravel Reverb) và Docker là lợi thế.',
'- Mức lương cạnh tranh từ 18 - 28 triệu VNĐ.\n- Lương tháng 13, thưởng hiệu quả dự án.\n- Bảo hiểm sức khỏe FPT Care toàn diện.',
18000000, 28000000, 0, 'full_time', 'Hà Nội', 'Khu Công Nghệ Cao Hòa Lạc, Thạch Thất, Hà Nội', DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'active');

-- 7. Gắn kỹ năng cho việc làm mẫu
INSERT INTO `job_skills` (`job_id`, `skill_id`) VALUES
(1, 1),
(1, 2),
(1, 6),
(1, 7),
(1, 8);
