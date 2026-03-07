export type Festival = {
  _id: string;
  name: string;
  festivalType?: 'ganesh' | 'durga' | 'other';
  siteType?: 'lake' | 'river' | 'beach' | 'pond' | 'spot' | 'other';
  siteName?: string;
  landmark?: string;
  description?: string;
  coordinates: { lat: number; lng: number };
  imageBase64: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  reporter: string;
  notes?: string;
  process?: {
    stage?: 'not_started' | 'prep' | 'gas_mixing' | 'crystal_formation' | 'completed';
    notes?: string;
    checklist?: {
      ammoniaContainerReady?: boolean;
      co2ContainerReady?: boolean;
      gasesConnected?: boolean;
      solutionCooled?: boolean;
      crystalsObserved?: boolean;
    };
    startedAt?: string;
    completedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
};
