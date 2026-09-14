ALTER TABLE train_sets
    ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

UPDATE train_sets s
SET sort_order = ranked.ord
FROM (
    SELECT s.id,
           COALESCE(
               e.sort_order,
               DENSE_RANK() OVER (PARTITION BY s.session_id ORDER BY s.exercise_name) - 1
           ) AS ord
    FROM train_sets s
    JOIN train_sessions sess ON sess.id = s.session_id
    LEFT JOIN train_template_exercises e
      ON e.template_id = sess.template_id
     AND lower(e.name) = lower(s.exercise_name)
) ranked
WHERE s.id = ranked.id;
