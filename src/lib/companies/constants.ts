const companySelectBase = [
  'id',
  'organization_id',
  'name',
  'legal_name',
  'cnpj',
  'is_active',
  'created_at',
  'updated_at',
].join(', ');

export const companySelect = companySelectBase + ', logo_path';
export { companySelectBase };
