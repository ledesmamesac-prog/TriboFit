SELECT w.workout_id, u.username, w.start_time, w.status
FROM workouts w
JOIN users u ON u.user_id = w.user_id
WHERE w.user_id IN (
    SELECT gm2.user_id
    FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = :mi_user_id
      AND gm2.user_id <> :mi_user_id
)
AND (w.status = 'in_progress' OR w.start_time::date = CURRENT_DATE)
ORDER BY w.start_time DESC;
