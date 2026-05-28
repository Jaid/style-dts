declare module '*.css' {
  const style: string
  export default style
}
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
