// 定义文件对象接口
export interface R2Object {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
  contentType?: string;
  isFolder?: boolean; // 表示这是一个文件夹
} 