ALTER TABLE routine_blocks
    ADD COLUMN color VARCHAR(16) NOT NULL DEFAULT '#0095f6';

UPDATE routine_blocks SET color = '#fcaf45' WHERE title = 'Wake Up';
UPDATE routine_blocks SET color = '#e1306c' WHERE title = 'Workout';
UPDATE routine_blocks SET color = '#0095f6' WHERE title = 'Shower';
UPDATE routine_blocks SET color = '#833ab4' WHERE title = 'Meditate';
UPDATE routine_blocks SET color = '#f77737' WHERE title = 'Breakfast';
UPDATE routine_blocks SET color = '#405de6' WHERE title = 'Read';
UPDATE routine_blocks SET color = '#262626' WHERE title IN ('Office', 'Work');
UPDATE routine_blocks SET color = '#c13584' WHERE title = 'Lunch';
UPDATE routine_blocks SET color = '#ed4956' WHERE title = 'Dinner';
UPDATE routine_blocks SET color = '#00c853' WHERE title = 'Walk';
UPDATE routine_blocks SET color = '#5b51d8' WHERE title = 'Night Routine';
UPDATE routine_blocks SET color = '#00376b' WHERE title = 'Sleep';
UPDATE routine_blocks SET color = '#737373' WHERE title IN ('Open block', 'Afternoon');
