-- Anonymized demo seed for local template evaluation.
-- Password for both users: Doctor123!
-- bcrypt hash generated with bcryptjs cost 10.
--
-- ACL note: nav matches tbl_sidebar.sidebar_name_en to rightName in
-- src/components/Dashboard/Sidebar/config/navSections.js.
-- Lab user gets NO user_rights rows → full company nav (admin bypass).
-- Doctor user gets the doctor-facing rights below.

SET NAMES utf8mb4;

INSERT INTO tbl_cabinet (
  cabinet_id, cabinet_nom, cabinet_nom_legal, cabinet_phone, cabinet_email,
  cabinet_website, cabinet_fax, cabinet_adresse_num, cabinet_adresse,
  cabinet_adresse_npa, cabinet_adresse_ville, cabinet_adresse_pays
) VALUES
  -- id=1 lab org (logged-in company user). id=2 doctor practice — pick this when creating cases.
  (1, 'Demo Align Lab', 'Demo Align Lab SA', '+41 00 000 00 01', 'lab@example.com',
   'https://www.example.com', '', '1', 'Lab Street',
   '1000', 'Lausanne', 'Switzerland'),
  (2, 'Demo Dental Clinic', 'Demo Dental Clinic Sàrl', '+41 00 000 00 02', 'doctor@example.com',
   'https://clinic.example.com', '', '12', 'Clinic Avenue',
   '1200', 'Geneva', 'Switzerland')
ON DUPLICATE KEY UPDATE
  cabinet_nom = VALUES(cabinet_nom),
  cabinet_email = VALUES(cabinet_email);

INSERT INTO users (
  user_id, user_name, user_password, user_firstname, user_lastname,
  user_phone, user_website, user_cabinet_adresse, user_cabinet_adresse_npa,
  user_cabinet_adresse_ville, user_cabinet_adresse_pays, user_is_superadmin,
  user_status, idx_client, user_cabinet_nom, user_fonction
) VALUES
  (1, 'lab@example.com',
   '$2b$10$el8YPlqMQH7f7OklsSUtzuSyfFQajkIuApSxmdWHw0wVPcEHt/W3O',
   'Alex', 'Lab',
   '+41 00 000 00 01', 'https://www.example.com', 'Lab Street', '1000',
   'Lausanne', 'Switzerland', 1,
   1, 1, 'Demo Align Lab', 'Lab manager'),
  (2, 'doctor@example.com',
   '$2b$10$el8YPlqMQH7f7OklsSUtzuSyfFQajkIuApSxmdWHw0wVPcEHt/W3O',
   'Sam', 'Doctor',
   '+41 00 000 00 02', 'https://clinic.example.com', 'Clinic Avenue', '1200',
   'Geneva', 'Switzerland', 0,
   1, 2, 'Demo Dental Clinic', 'Dentist')
ON DUPLICATE KEY UPDATE
  user_password = VALUES(user_password),
  user_status = VALUES(user_status),
  idx_client = VALUES(idx_client),
  user_is_superadmin = VALUES(user_is_superadmin);

-- Clear prior ACL so re-seed is deterministic (db:setup without reset).
DELETE FROM user_rights;
DELETE FROM tbl_sidebar;

-- sidebar_name_en MUST match navSections.js rightName / rightNames exactly.
INSERT INTO tbl_sidebar (
  sidebar_id, sidebar_identify, sidebar_name_en, sidebar_name_fr,
  sidebar_parent, sidebar_has_children, sidebar_order
) VALUES
  (1,  'home',              'Home',              'Accueil',                 0, 0, 10),
  (2,  'last_cases',        'Last Cases',        'Derniers cas',            0, 0, 20),
  (3,  'list_cabinets',     'List of cabinets',  'Liste des cabinets',      0, 0, 30),
  (4,  'add_cabinet',       'Add new cabinet',   'Ajouter un cabinet',      0, 0, 40),
  (5,  'list_cases',        'List of cases',     'Liste des cas',           0, 0, 50),
  (6,  'add_case',          'Add new case',      'Ajouter un cas',          0, 0, 60),
  (7,  'crm_doctors_billing','Doctors Billing',  'Facturation médecins',    0, 0, 70),
  (8,  'list_users',        'List of users',     'Liste des utilisateurs',  0, 0, 80),
  (9,  'add_user',          'Add new user',      'Ajouter un utilisateur',  0, 0, 90);

-- Lab (company): no user_rights → full nav (see useFilteredNavSections).
-- Doctor: grant overview + case management rights.
INSERT INTO user_rights (user_idx, rights_idx) VALUES
  (2, 1),
  (2, 2),
  (2, 5),
  (2, 6);

INSERT INTO tbl_case (
  case_id, case_ref, cabinet_idx, case_title, case_prenom, case_nom,
  case_naissance, case_email, case_address, case_phone, case_status,
  case_comments, case_prop_price, case_prop_cur, case_created, case_notif
) VALUES
  (1001, 'DEMO-1001', 2, 1, 'Jordan', 'Martin',
   '1990-05-12', 'jordan.martin@example.com', '10 Demo Road', '+41 79 000 00 01', 5,
   'Demo case in fabrication', 3200.00, 'CHF', NOW() - INTERVAL 14 DAY, 0),
  (1002, 'DEMO-1002', 2, 2, 'Taylor', 'Bernard',
   '1988-11-03', 'taylor.bernard@example.com', '22 Sample Street', '+41 79 000 00 02', 3,
   'Demo case study', 2800.00, 'CHF', NOW() - INTERVAL 7 DAY, 0),
  (1003, 'DEMO-1003', 2, 1, 'Casey', 'Dupont',
   '1995-02-20', 'casey.dupont@example.com', '5 Example Lane', '+41 79 000 00 03', 4,
   'Demo awaiting acceptance', 3500.00, 'CHF', NOW() - INTERVAL 2 DAY, 1),
  (1004, 'DEMO-1004', 2, 2, 'Riley', 'Moreau',
   '1992-07-08', 'riley.moreau@example.com', '8 Demo Close', '+41 79 000 00 04', 2,
   'Demo beware — doctor follow-up needed', 2400.00, 'CHF', NOW() - INTERVAL 4 DAY, 2),
  (1005, 'DEMO-1005', 2, 1, 'Avery', 'Keller',
   '1987-01-15', 'avery.keller@example.com', '3 Sample Way', '+41 79 000 00 05', 7,
   'Demo delivered case', 4000.00, 'CHF', NOW() - INTERVAL 60 DAY, 0)
ON DUPLICATE KEY UPDATE
  case_status = VALUES(case_status),
  case_comments = VALUES(case_comments);

INSERT INTO tbl_traitements (case_idx, traitements_type) VALUES
  (1001, 1), (1001, 2),
  (1002, 1),
  (1003, 1), (1003, 3),
  (1004, 1),
  (1005, 1), (1005, 2)
ON DUPLICATE KEY UPDATE traitements_type = VALUES(traitements_type);

INSERT INTO tbl_reply (reply_id, case_idx, user_idx, reply_text, reply_type, reply_created)
VALUES
  (1, 1001, 1, 'Welcome to the demo discussion thread for DEMO-1001.', 0, NOW() - INTERVAL 10 DAY),
  (2, 1001, 2, 'Thanks — patient records look good to proceed.', 0, NOW() - INTERVAL 9 DAY),
  (3, 1003, 1, 'Quote ready for review.', 4, NOW() - INTERVAL 1 DAY),
  (4, 1004, 2, 'Patient reports tightness on upper right — please advise.', 0, NOW() - INTERVAL 3 DAY)
ON DUPLICATE KEY UPDATE reply_text = VALUES(reply_text);

INSERT INTO tbl_chat (chat_id, case_idx, user_idx, cabinet_idx, chat_text, chat_created)
VALUES
  (1, 1001, 1, 1, 'Internal note: aligners batch scheduled for Thursday.', NOW() - INTERVAL 8 DAY)
ON DUPLICATE KEY UPDATE chat_text = VALUES(chat_text);

INSERT INTO tbl_suivi (
  suivi_id, case_idx, user_idx, cabinet_idx, suivi_text, suivi_type, suivi_created
) VALUES
  (1, 1001, 1, 1, 'Fabrication started for upper/lower aligners.', 0, NOW() - INTERVAL 12 DAY),
  (2, 1002, 1, 1, 'Case study checklist opened.', 0, NOW() - INTERVAL 6 DAY),
  (3, 1005, 1, 1, 'Final delivery confirmed with clinic.', 0, NOW() - INTERVAL 55 DAY)
ON DUPLICATE KEY UPDATE suivi_text = VALUES(suivi_text);

INSERT INTO tbl_events (
  ev_id, case_idx, ev_title, ev_start_date, ev_start_time, ev_end_date, ev_end_time,
  ev_all_day, ev_status, ev_created_at, ev_created_by
) VALUES
  (1, 1001, 'Open box — DEMO-1001', CURDATE() + INTERVAL 3 DAY, '09:00:00',
   CURDATE() + INTERVAL 3 DAY, '09:00:00', 1, 1, NOW(), 1),
  (2, 1005, 'Delivered — DEMO-1005', CURDATE() - INTERVAL 50 DAY, '00:00:00',
   CURDATE() - INTERVAL 50 DAY, '00:00:00', 1, 1, NOW() - INTERVAL 50 DAY, 1)
ON DUPLICATE KEY UPDATE ev_title = VALUES(ev_title);

INSERT INTO case_docs (docs_id, case_idx, docs_type, docs_name, docs_size, docs_title)
VALUES
  (1, 1001, 'documents', 'a1b2c3d4e5f6789012345678abcdef01.pdf', '120kb', 'Demo treatment plan.pdf')
ON DUPLICATE KEY UPDATE docs_title = VALUES(docs_title);

INSERT INTO tbl_checkbox_stripping (case_idx, steps_data, case_ref, stripping_completed_steps, last_updated_at)
VALUES
  (1002, JSON_ARRAY(), 'DEMO-1002', '', NOW())
ON DUPLICATE KEY UPDATE case_ref = VALUES(case_ref);

INSERT INTO tbl_stripping_v2 (case_idx, case_ref, schema_version, scene_json, last_updated_at)
VALUES
  (1002, 'DEMO-1002', 1, JSON_OBJECT('schemaVersion', 1, 'cases', JSON_ARRAY(), 'attachments', JSON_ARRAY()), NOW())
ON DUPLICATE KEY UPDATE case_ref = VALUES(case_ref);

INSERT INTO tbl_services_lab (code, service, vpt, points, point_value, sort_order) VALUES
  ('ALIGN-FULL', 'Full clear aligner treatment', 1.0000, 1.0000, 3200.0000, 10),
  ('ALIGN-REFINE', 'Refinement set', 1.0000, 1.0000, 450.0000, 20)
ON DUPLICATE KEY UPDATE service = VALUES(service), point_value = VALUES(point_value);

INSERT INTO tbl_services_direct (code, service, vpt, points, point_value, sort_order) VALUES
  ('ALIGN-FULL', 'Full clear aligner treatment (direct)', 1.0000, 1.0000, 3600.0000, 10),
  ('ALIGN-REFINE', 'Refinement set (direct)', 1.0000, 1.0000, 500.0000, 20)
ON DUPLICATE KEY UPDATE service = VALUES(service), point_value = VALUES(point_value);

INSERT INTO tbl_invoices (
  id, case_id, treatment_duration, treatment_steps, total_price,
  monthly_payment_enabled, amount_paid, invoice_status, generated_date,
  invoice_ref, services_json, show_free_services, vat_rate
) VALUES
  (
    'demo-invoice-1001',
    1001,
    '12',
    '20',
    3200.00,
    0,
    0,
    1,
    DATE_FORMAT(NOW(), '%Y-%m-%d'),
    'Q-DEMO-1001',
    '[{"code":"ALIGN-FULL","service":"Full clear aligner treatment","qty":1,"unitPrice":3200,"total":3200}]',
    0,
    0.0810
  ),
  (
    'demo-invoice-1003',
    1003,
    '14',
    '24',
    3500.00,
    0,
    0,
    2,
    DATE_FORMAT(NOW(), '%Y-%m-%d'),
    'INV-DEMO-1003',
    '[{"code":"ALIGN-FULL","service":"Full clear aligner treatment","qty":1,"unitPrice":3500,"total":3500}]',
    0,
    0.0810
  ),
  (
    'demo-invoice-1005',
    1005,
    '12',
    '24',
    4000.00,
    0,
    4000.00,
    3,
    DATE_FORMAT(NOW() - INTERVAL 45 DAY, '%Y-%m-%d'),
    'INV-DEMO-1005',
    '[{"code":"ALIGN-FULL","service":"Full clear aligner treatment","qty":1,"unitPrice":4000,"total":4000}]',
    0,
    0.0810
  )
ON DUPLICATE KEY UPDATE
  total_price = VALUES(total_price),
  invoice_status = VALUES(invoice_status),
  services_json = VALUES(services_json),
  amount_paid = VALUES(amount_paid);
