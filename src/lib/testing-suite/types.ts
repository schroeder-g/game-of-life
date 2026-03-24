export interface DocItem {
  id: string;
  type: 'h3' | 'p';
  text: string;
  testIds?: string[];
  references?: string[];
}

export interface ManualTest {
  id:string;
  title: string;
  steps: string[];
  claimIds: string[];
}

export type ManualTestStatus = 'checked' | 'failed' | undefined;
