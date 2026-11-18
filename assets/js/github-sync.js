const API_BASE = 'https://api.github.com';

function buildHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (token) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

async function ghFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(token),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    let errDetail = '';
    try {
      const body = await res.json();
      errDetail = body?.message || '';
    } catch {
      errDetail = await res.text();
    }
    throw new Error(`GitHub API (${res.status}): ${errDetail || res.statusText}`);
  }

  if (res.status === 204) return null;
  return await res.json();
}

function decodeBase64UTF8(base64Str) {
  const clean = base64Str.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Kiểm tra quyền kết nối tới Repository và lấy đường dẫn GitHub Pages hiện tại
 */
export async function verifyGitHubConnection({ owner, repo, branch = 'main', token }) {
  const cleanOwner = (owner || '').trim();
  const cleanRepo = (repo || '').trim();
  const cleanToken = (token || '').trim();

  if (!cleanOwner || !cleanRepo || !cleanToken) {
    throw new Error('Vui lòng nhập đầy đủ GitHub Username, Tên Repository và Personal Access Token.');
  }

  let authUser;
  try {
    authUser = await ghFetch('/user', cleanToken);
  } catch (err) {
    if (err.message.includes('401')) {
      throw new Error('Mã GitHub Personal Access Token không hợp lệ hoặc đã hết hạn.');
    }
    throw err;
  }

  let repoInfo;
  try {
    repoInfo = await ghFetch(`/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}`, cleanToken);
  } catch (err) {
    if (err.message.includes('404')) {
      throw new Error(`Không tìm thấy kho lưu trữ "${cleanOwner}/${cleanRepo}" hoặc Token chưa được cấp quyền cho Repo này.`);
    }
    throw err;
  }

  const canPush = Boolean(
    repoInfo.permissions?.push ||
    repoInfo.permissions?.admin ||
    repoInfo.permissions?.maintain
  );

  if (!canPush) {
    throw new Error(
      `Từ chối truy cập: Tài khoản GitHub @${authUser.login} không có quyền Quản trị / Ghi (Write) trên kho lưu trữ ${repoInfo.full_name}.`
    );
  }

  let pagesUrl = `https://${cleanOwner}.github.io/${cleanRepo}/`;
  let pagesEnabled = false;

  try {
    const pagesInfo = await ghFetch(`/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/pages`, cleanToken);
    if (pagesInfo?.html_url) {
      pagesUrl = pagesInfo.html_url;
      pagesEnabled = true;
    }
  } catch {
    // Pages chưa bật hoặc repo riêng tư chưa cấu hình Pages
  }

  // Kiểm tra nhánh tồn tại
  const targetBranch = (branch || '').trim() || repoInfo.default_branch || 'main';
  await ghFetch(
    `/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/ref/heads/${encodeURIComponent(targetBranch)}`,
    cleanToken
  );

  return {
    fullName: repoInfo.full_name,
    private: repoInfo.private,
    defaultBranch: repoInfo.default_branch,
    branch: targetBranch,
    canPush,
    adminLogin: authUser.login,
    adminAvatar: authUser.avatar_url || '',
    pagesUrl,
    pagesEnabled
  };
}

/**
 * Tự động bật chế độ GitHub Pages (GitHub Actions Workflow) nếu người dùng bấm kích hoạt nhanh
 */
export async function enableGitHubPagesWorkflow({ owner, repo, token }) {
  try {
    const created = await ghFetch(`/repos/${owner}/${repo}/pages`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ build_type: 'workflow' })
    });
    return created;
  } catch (err) {
    // Nếu Pages đã tồn tại nhưng đang ở chế độ legacy, chuyển sang workflow
    if (err.message.includes('409') || err.message.includes('already')) {
      return await ghFetch(`/repos/${owner}/${repo}/pages`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ build_type: 'workflow' })
      });
    }
    throw err;
  }
}

/**
 * Tải trực tiếp file data/site-data.json mới nhất từ GitHub về BDS Studio
 */
export async function pullSiteDataFromGitHub({ owner, repo, branch = 'main', token }) {
  const fileObj = await ghFetch(
    `/repos/${owner}/${repo}/contents/data/site-data.json?ref=${encodeURIComponent(branch)}`,
    token
  );
  if (!fileObj?.content) {
    throw new Error('Không tìm thấy nội dung data/site-data.json trên nhánh đã chọn.');
  }
  const text = decodeBase64UTF8(fileObj.content);
  return JSON.parse(text);
}

/**
 * XUẤT BẢN 1-CLICK (KHÔNG CẦN GIT PUSH):
 * Đẩy toàn bộ hình ảnh WebP mới + data/site-data.json lên GitHub chỉ trong 1 Commit nguyên tử duy nhất,
 * tự động kích hoạt GitHub Actions cập nhật Website.
 */
export async function publishToGitHub({
  owner,
  repo,
  branch = 'main',
  token,
  siteData,
  pendingUploads = [],
  commitMessage = '✨ Cập nhật dự án & nội dung từ BDS Studio App',
  onProgress = () => {}
}) {
  if (!owner || !repo || !token) {
    throw new Error('Chưa cấu hình kết nối GitHub. Hãy nhập Username, Repo và Token ở mục Xuất bản GitHub.');
  }

  onProgress({ step: 'init', percent: 10, label: 'Đang lấy trạng thái nhánh hiện tại từ GitHub...' });

  // 1. Lấy SHA commit mới nhất của nhánh
  const refData = await ghFetch(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
  const latestCommitSha = refData.object.sha;

  const commitData = await ghFetch(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, token);
  const baseTreeSha = commitData.tree.sha;

  const treeItems = [];

  // 2. Đẩy tất cả ảnh WebP đang chờ lên GitHub dưới dạng Git Blobs
  if (pendingUploads.length > 0) {
    for (let i = 0; i < pendingUploads.length; i++) {
      const item = pendingUploads[i];
      const pct = 15 + Math.round(((i + 1) / pendingUploads.length) * 45);
      onProgress({
        step: 'upload_images',
        percent: pct,
        label: `Đang tải hình ảnh tối ưu (${i + 1}/${pendingUploads.length}): ${item.filename}...`
      });

      const blobRes = await ghFetch(`/repos/${owner}/${repo}/git/blobs`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: item.base64Content,
          encoding: 'base64'
        })
      });

      treeItems.push({
        path: item.repoPath.replace(/^\.?\//, ''),
        mode: '100644',
        type: 'blob',
        sha: blobRes.sha
      });
    }
  }

  // 3. Tạo Blob cho data/site-data.json đã cập nhật thời gian
  onProgress({ step: 'upload_data', percent: 70, label: 'Đang đóng gói dữ liệu dự án & cấu hình thương hiệu...' });

  const updatedSiteData = {
    ...siteData,
    meta: {
      ...(siteData.meta || {}),
      repoOwner: owner.trim(),
      repoName: repo.trim(),
      updatedAt: new Date().toISOString(),
      version: Number(siteData.meta?.version || 1) + 1
    }
  };

  const jsonBlob = await ghFetch(`/repos/${owner}/${repo}/git/blobs`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: JSON.stringify(updatedSiteData, null, 2),
      encoding: 'utf-8'
    })
  });

  treeItems.push({
    path: 'data/site-data.json',
    mode: '100644',
    type: 'blob',
    sha: jsonBlob.sha
  });

  // 4. Tạo Git Tree mới
  onProgress({ step: 'create_tree', percent: 82, label: 'Đang hợp nhất cấu trúc dữ liệu lên kho lưu trữ...' });
  const newTree = await ghFetch(`/repos/${owner}/${repo}/git/trees`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems
    })
  });

  // 5. Tạo Commit nguyên tử duy nhất
  onProgress({ step: 'create_commit', percent: 90, label: 'Đang ghi nhận bản phát hành chính thức...' });
  const newCommit = await ghFetch(`/repos/${owner}/${repo}/git/commits`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMessage,
      tree: newTree.sha,
      parents: [latestCommitSha]
    })
  });

  // 6. Cập nhật nhánh để GitHub Actions tự động Deploy lên GitHub Pages
  onProgress({ step: 'update_ref', percent: 97, label: 'Đang kích hoạt GitHub Pages tự động triển khai...' });
  await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sha: newCommit.sha,
      force: false
    })
  });

  onProgress({ step: 'done', percent: 100, label: 'Đã xuất bản lên GitHub thành công!' });

  return {
    commitSha: newCommit.sha,
    commitUrl: newCommit.html_url || `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    updatedSiteData
  };
}

/**
 * Kiểm tra tiến trình chạy GitHub Actions Deploy mới nhất
 */
export async function fetchLatestDeployStatus({ owner, repo, token }) {
  try {
    const res = await ghFetch(`/repos/${owner}/${repo}/actions/runs?per_page=1`, token);
    const run = res?.workflow_runs?.[0];
    if (!run) return null;
    return {
      id: run.id,
      name: run.name,
      status: run.status, // queued | in_progress | completed
      conclusion: run.conclusion, // success | failure | null
      htmlUrl: run.html_url,
      createdAt: run.created_at
    };
  } catch {
    return null;
  }
}
