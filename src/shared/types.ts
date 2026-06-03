export interface MilestoneArtifact {
  file: string
  optional?: boolean
}

export interface Milestone {
  id: string
  name: string
  artifacts: (string | MilestoneArtifact)[]
  description: string
}
