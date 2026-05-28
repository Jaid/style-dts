declare module '*.scss' {
  const style: string
  export default style
}
declare module '*.module.scss' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
