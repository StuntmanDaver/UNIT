// services/propertyGroups.ts
//
// Types for the property_groups + property_group_members tables added by
// migration 20260501000002_property_clusters.sql. The PRD chose
// radius-based auto-grouping for the Nearby feed (US-004), so these
// labelled-cluster tables are NOT consumed in this milestone — the types
// exist so future labelled-cluster UI is unblocked.

export type PropertyGroup = {
  id: string;
  name: string;
  created_at: string;
};

export type PropertyGroupMember = {
  property_id: string;
  group_id: string;
  created_at: string;
};
