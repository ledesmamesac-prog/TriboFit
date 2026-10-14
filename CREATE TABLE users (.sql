CREATE TABLE users (
    user_id UUID PRIMARY KEY,           
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    profile_picture_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE groups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    group_id INT REFERENCES groups(group_id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, group_id)
);

CREATE TABLE workouts (
    workout_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed'))
);

CREATE TABLE exercise_catalog (
    exercise_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    body_part VARCHAR(50) NOT NULL
);

CREATE TABLE workout_logs (
    log_id SERIAL PRIMARY KEY,
    workout_id INT NOT NULL REFERENCES workouts(workout_id) ON DELETE CASCADE,
    exercise_id INT NOT NULL REFERENCES exercise_catalog(exercise_id),
    set_number INT NOT NULL,
    reps INT NOT NULL,
    weight NUMERIC(6,2)
);

CREATE INDEX idx_workouts_user_status ON workouts(user_id, status);
CREATE INDEX idx_logs_workout ON workout_logs(workout_id);

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