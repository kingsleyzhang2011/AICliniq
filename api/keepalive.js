import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Only process standard GET/POST methods or cron-induced invocations
  try {
    // 执行一次超轻型的底层查询：仅索取 user_profiles 中任何一行的主键
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id')
      .limit(1);

    if (error) {
      console.error('[Cron Keepalive] Supabase 连线查询失败，可能已休眠/密钥错误:', error.message);
      return res.status(500).json({ status: 'fail', error: error.message });
    }

    console.log('[Cron Keepalive] 成功唤醒/连接并触发数据库读操作。网络稳定。', new Date().toISOString());
    return res.status(200).json({ 
        status: 'ok', 
        message: 'Supabase ping received and served.',
        timestamp: new Date().toISOString(),
        bytesRead: data?.length || 0 
    });
  } catch (err) {
    console.error('[Cron Keepalive] Serverless 执行异常:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
