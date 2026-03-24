-- LifeGuard AI Database Schema v1.0
-- 在 Supabase SQL Editor 中执行
-- 执行前确认已开启 pgcrypto 扩展

-- 开启扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID DEFAULT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'doctor', 'nurse')),
    region TEXT DEFAULT 'overseas',
    preferred_language TEXT DEFAULT 'zh' CHECK (preferred_language IN ('zh', 'en')),
    chronic_diseases TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    flavor_preferences JSONB DEFAULT '{}',
    blacklist TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. health_records
CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    organization_id UUID DEFAULT NULL,
    indicator_name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT,
    reference_range TEXT,
    is_abnormal BOOLEAN DEFAULT false,
    confirmed_by_user BOOLEAN DEFAULT false,
    recorded_at TIMESTAMPTZ DEFAULT now(),
    source_file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. vitals_log
CREATE TABLE IF NOT EXISTS vitals_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    organization_id UUID DEFAULT NULL,
    vital_type TEXT NOT NULL, -- 'blood_pressure_sys','blood_pressure_dia','heart_rate','blood_glucose','weight','temperature'
    value NUMERIC NOT NULL,
    unit TEXT,
    recorded_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

-- 4. chat_sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    organization_id UUID DEFAULT NULL,
    query TEXT,
    query_type TEXT DEFAULT 'general',
    language TEXT DEFAULT 'zh',
    doctor_roles JSONB DEFAULT '[]',
    messages JSONB DEFAULT '[]',
    ai_provider TEXT,
    region TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    organization_id UUID DEFAULT NULL,
    report_type TEXT DEFAULT 'weekly',
    content_markdown TEXT,
    generated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. push_settings
CREATE TABLE IF NOT EXISTS push_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE UNIQUE,
    organization_id UUID DEFAULT NULL,
    enabled BOOLEAN DEFAULT true,
    reminder_types TEXT[] DEFAULT '{medication,abnormal_alert}',
    quiet_hours JSONB DEFAULT '{"start":"22:00","end":"08:00"}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. share_tokens (亲友分享)
CREATE TABLE IF NOT EXISTS share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'base64url'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 开启 RLS 策略
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- 全局 RLS：只有所有者可以访问
CREATE POLICY user_profiles_policy ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY health_records_policy ON health_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY vitals_log_policy ON vitals_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY chat_sessions_policy ON chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY reports_policy ON reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY push_settings_policy ON push_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY share_tokens_policy ON share_tokens FOR ALL USING (auth.uid() = user_id);

-- 自动更新 updated_at 的触发器绑定
CREATE TRIGGER tr_update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_update_push_settings_updated_at BEFORE UPDATE ON push_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 公开只读函数：根据 Token 获取报告
-- 需求：通过此函数，持有合法 token 的第三方（即便不登录）也能看到报告
CREATE OR REPLACE FUNCTION get_report_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    report_type TEXT,
    content_markdown TEXT,
    generated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.user_id, r.report_type, r.content_markdown, r.generated_at
    FROM reports r
    JOIN share_tokens t ON r.user_id = t.user_id
    WHERE t.token = p_token 
      AND t.is_active = true 
      AND t.expires_at > now()
    ORDER BY r.generated_at DESC;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;

-- 常用查询索引
CREATE INDEX idx_health_records_user_date ON health_records (user_id, recorded_at DESC);
CREATE INDEX idx_vitals_log_lookup ON vitals_log (user_id, vital_type, recorded_at DESC);
CREATE INDEX idx_chat_sessions_user_date ON chat_sessions (user_id, created_at DESC);
CREATE INDEX idx_active_share_tokens ON share_tokens (token) WHERE is_active = true;
