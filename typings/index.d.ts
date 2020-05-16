declare module 'ytsr' {
  namespace ytsr{
    type options = {
      searchString?:string
      safeSearch?:boolean
      limit?:number
      nextPageRef?:string
    }
    type result = {
      query:string
      items:{
        type:string
        title:string
        link:string
        thumbnail:string
        author:{
          name:string
          ref:string
          verified:boolean
        },
        description:string
        duration:string
        meta?:string[]
        actors?:string[]
        views?:string
        director?:string
        uploaded_at?:string
      }[]
      nextpageRef:string
      results:string
      filters:{
        ref?:string
        name:string
        active:boolean
      }[]
      currentRef?:string
    }
  }
  function ytsr(id:string,callback:((err:Error,result:ytsr.result)=>any)):void
  function ytsr(id:string,options:ytsr.options,callback:((err:Error,result:ytsr.result)=>any)):void
  function ytsr(id:string):Promise<ytsr.result>
  function ytsr(id:string,options:ytsr.options):Promise<ytsr.result>
  export = ytsr;
}
