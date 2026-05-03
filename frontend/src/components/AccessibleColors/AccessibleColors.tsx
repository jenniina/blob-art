export interface ColorBlock {
  color: string
  colorFormat: 'hex' | 'rgb' | 'hsl'
}

export interface ComplianceResult {
  isAAARegularTextCompliant: boolean
  isAARegularTextCompliant: boolean
  isAAUIComponentsCompliant: boolean
}
