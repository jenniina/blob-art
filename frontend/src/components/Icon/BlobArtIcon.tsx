import React from 'react'

export interface BlobArtIconProps extends React.SVGProps<SVGSVGElement> {
  title?: string
}

const BlobArtIcon: React.FC<BlobArtIconProps> = ({
  title = 'BlobArt',
  ...props
}) => (
  <svg
    viewBox="0 0 120 120"
    width="1em"
    height="1em"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={title}
    fill="currentColor"
    role="img"
    {...props}
  >
    {title ? <title>{title}</title> : null}
    <path d="M117.44,43.33c-3.64-12.41-17.03-14.2-29.1-13.18-8.67.73-1.33-18.12-16.64-26.22-12.2-6.2-23.45-.24-28.73,9.9-3.51,6.73-2.73,23.39-8.64,29.45-6.34,6.49-20.1,3.42-28.6,17.93-9.43,16.1-.89,32.9,10.61,38.23,12.93,5.99,28.08-.64,35,2.34,12.9,5.56,9.77,15.89,29.28,15.82s17.14-19.1,14.98-30.13c-.91-4.66-3.5-15.36,4.86-18.38,13.22-4.79,20.64-13.34,17-25.75ZM74.48,44.49c2.74-.19,10.28,19.47,8.78,22.78-3.71,8.2-15.66,4.35-18.74,3.19s-6.37-13.01-5.44-16.02c1.04-3.37,1.69-5.68,4.39-7.53s8.27-2.23,11.02-2.42Z" />
    <circle cx="18.36" cy="21.11" r="13.1" />
    <circle cx="110.72" cy="81.36" r="7.64" />
  </svg>
)

export default BlobArtIcon
