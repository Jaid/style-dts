declare module '*.sass' {
  const style: string
  export default style
}
declare module '*.module.sass' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
