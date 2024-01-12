import axios from 'axios';
import config from './config.js';

const getTenantAccessToken = async () => {
    const response = await axios({
        method: 'POST',
        url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            app_id: config.feishu.App_ID,
            app_secret: config.feishu.App_Secret,
        }),
    });
    return response.data.tenant_access_token;
};

export default getTenantAccessToken;