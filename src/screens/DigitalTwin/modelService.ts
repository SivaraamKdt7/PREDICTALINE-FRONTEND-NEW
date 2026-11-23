export interface UploadResponse {
  componentPath: string;
  componentName: string;
  modelUrl: string;
}
export interface UploadedModel extends UploadResponse {
  id: string;
  name: string;
  assetId: string;
  description: string;
  tags: string;
  size: number;
  visible: boolean;
  wireframe: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}
const parse = async <T,>(response: Response): Promise<T> => {
  if (!response.ok) {
    const type = response.headers.get('content-type') || '';
    const body = type.includes('json') ? await response.json() as {error?:string} : null;
    throw new Error(body?.error || `Model request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
};
export const getGeneratedModels = async () => parse<UploadedModel[]>(await fetch('/api/models', { cache: 'no-store' }));
export async function uploadModel(file: File, info:{name:string;assetId:string;description:string;tags:string}) {
  const form = new FormData();
  form.append('model', file);
  for (const [key,value] of Object.entries(info)) form.append(key,value);
  return parse<UploadedModel>(await fetch('/api/upload-model', { method:'POST', body:form }));
}
export const saveModel = async (model:UploadedModel) => parse<UploadedModel>(await fetch(`/api/models/${model.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(model) }));
export const deleteModel = async (id:string) => parse<{deleted:string}>(await fetch(`/api/models/${id}`, { method:'DELETE' }));
