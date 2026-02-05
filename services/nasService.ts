const DEV_API_BASE = "/api";
const ENV_API_BASE = import.meta.env.VITE_NAS_API_BASE as string | undefined;
const API_BASE = ENV_API_BASE
  ? ENV_API_BASE.replace(/\/+$/, "")
  : import.meta.env.DEV
    ? DEV_API_BASE
    : `${window.location.origin}/api`;

export async function createProjectFolder(data: {
  name: string;
  startDate: string;
  pmName?: string;
  designerNames?: string[];
}) {
  try {
    console.log('📤 NAS 폴더 생성 요청:', data);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`${API_BASE}/folder/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ NAS API 응답 오류:', response.status, errorText);
      throw new Error(`NAS API 요청 실패: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ NAS API 응답 수신:', result);
    return result;
  } catch (error) {
    console.error('❌ NAS API 호출 오류:', error);
    throw error;
  }
}
export async function completeProjectFolder(projectId: string, nasFolderPath: string) {
  try {
    const response = await fetch(`${API_BASE}/folder/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, nasFolderPath }),
    });

    if (!response.ok) {
      throw new Error(`NAS 완료 처리 실패: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ NAS 완료 처리 오류:', error);
    throw error;
  }
}

// force update
export async function renameProjectFolder(
  projectId: string,
  nasFolderPath: string,
  projectData: {
    name: string;
    startDate?: string;
    endDate?: string;
    pmName?: string;
    designerNames?: string[];
    pm_name?: string;
    designer_name?: string;
    designer_2_name?: string;
    designer_3_name?: string;
  },
  lastUpdated?: string
) {
  try {
    const response = await fetch(`${API_BASE}/folder/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, nasFolderPath, projectData, lastUpdated }),
    });

    if (!response.ok) {
      throw new Error(`NAS 이름 변경 실패: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ NAS 이름 변경 오류:', error);
    throw error;
  }
}
