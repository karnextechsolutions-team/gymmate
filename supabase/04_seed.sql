-- ============================================================================
-- GymMate — Seed data (SaaS plans, starter exercise & food library)
-- Run after 03_functions.sql.
-- ============================================================================

insert into public.saas_plans (name, slug, price_monthly, price_yearly, max_members, max_staff, features, sort_order) values
('Basic',      'basic',      29,  290,  150, 2,
  '{"workout_tracker": true, "attendance": true, "diet_planner": false, "analytics": false, "custom_branding": false}', 1),
('Premium',    'premium',    79,  790,  600, 8,
  '{"workout_tracker": true, "attendance": true, "diet_planner": true,  "analytics": true,  "custom_branding": false}', 2),
('Enterprise', 'enterprise', 199, 1990, null, null,
  '{"workout_tracker": true, "attendance": true, "diet_planner": true,  "analytics": true,  "custom_branding": true}', 3);

-- Starter global exercises (gym_id null = available to everyone)
insert into public.exercises (gym_id, name, muscle_groups, equipment, instructions) values
(null, 'Seated Cable Row', array['Back','Biceps','Rear Delts'], 'Cable Machine',
  'Sit tall with feet on the platform. Grip the handle and pull toward your torso, squeezing your shoulder blades. Control the weight back to the start.'),
(null, 'Barbell Bent-Over Row', array['Back','Shoulders','Biceps'], 'Barbell',
  'Hinge at the hips, keep a flat back, row the bar to your lower ribs, then lower under control.'),
(null, 'Bench Press', array['Chest','Triceps','Shoulders'], 'Barbell',
  'Lower the bar to mid-chest, then press straight up to lockout.'),
(null, 'Push-Up', array['Chest','Triceps'], 'Bodyweight',
  'Keep a straight line from head to heels, lower until your chest is just above the floor, press up.'),
(null, 'Bench Dips', array['Triceps','Shoulders'], 'Bench',
  'Lower your body by bending the elbows, then press back up.'),
(null, 'Barbell Back Squat', array['Quads','Glutes','Core'], 'Barbell',
  'Brace your core, sit back and down to depth, then drive up through mid-foot.'),
(null, 'Ab Wheel Rollout', array['Core','Shoulders'], 'Ab Wheel',
  'Roll out slowly keeping core braced, then pull back without arching the lower back.'),
(null, 'Air Squat', array['Quads','Glutes'], 'Bodyweight',
  'Sit back and down keeping chest up, then stand fully.');

-- Starter global foods
insert into public.foods (gym_id, name, calories, protein_g, carbs_g, fat_g, serving) values
(null, 'Boiled Egg',        78,  6,  1,  5, '1 egg'),
(null, 'Chicken Breast',   165, 31,  0,  4, '100 g'),
(null, 'White Rice',       205,  4, 45,  0, '1 cup cooked'),
(null, 'Oats',             150,  5, 27,  3, '40 g dry'),
(null, 'Banana',           105,  1, 27,  0, '1 medium'),
(null, 'Greek Yogurt',     100, 10,  6,  4, '170 g');
