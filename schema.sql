CREATE TABLE IF NOT EXISTS camera_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255),
  camera_model VARCHAR(255),
  profile JSON
);
