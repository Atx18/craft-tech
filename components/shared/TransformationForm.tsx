"use client"
 import { useState,useTransition,useEffect} from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
  
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { aspectRatioOptions, creditFee, defaultValues, transformationTypes } from "@/constants"
import { CustomField } from "./CustomField"
import { AspectRatioKey, debounce, deepMergeObjects } from "@/lib/utils"
import { updateCredits } from "@/lib/actions/user.actions"
import MediaUploader from "./MediaUploader"
import TransformedImage from "./TransformedImage"
import { useRouter } from "next/navigation"
import { getCldImageUrl } from "next-cloudinary"
import { addImage, updateImage } from "@/lib/actions/image.action"
import { InsufficientCreditsModal } from "./InsufficientCreditsModal"




export const formSchema = z.object({
    title: z.string(),
    aspectRatio: z.string().optional(),
    color: z.string().optional(),
    prompt: z.string().optional(),
    publicId: z.string(),
}) 





 const TransformationForm = ({action,data =null,userId, type, creditBalance, config = null  }:TransformationFormProps) => {
    const transformationType = transformationTypes[type]; 
    const [image, setImage] = useState(data);
    const [newTransformation, setNewTransformation] = useState<Transformations | null>(null);
    const [isSubmitting,setIsSubmitting]=useState(false)
    const [isTransforming,setIsTransforming]=useState(false);
    const [transformationConfig, setTransformationConfig] = useState(config)
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    //lets u update the state without bllocking the UI-usetransition



    const initialValues = data && action === 'Update' ? {
        title: data?.title,
        aspectRatio: data?.aspectRatio,
        color: data?.color,
        prompt: data?.prompt,
        publicId: data?.publicId,
      } : defaultValues
   


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialValues,
      })
     
     

   // final submithandler contains addimage,updateimage
     async  function onSubmit(values: z.infer<typeof formSchema>) {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.
       // we gona tranform the the image based on the event type.
       //cld image url is imported from cloudinary ai to transform
       //all promps are available in the type.utils.ts
        setIsSubmitting(true);
        if(data || image){
          const transformationUrl=getCldImageUrl({
            width:image?.width,
            height:image?.height,
            src:image?.publicId,
            ...transformationConfig
          })

        const imageData={
          title:values.title,
          publicId:image?.publicId,
          transformationType:type,
          width:image?.width,
          height:image?.height,
          config:transformationConfig,
          secureURL: image?.secureURL,
          transformationURL: transformationUrl,
          aspectRatio: values.aspectRatio,
          prompt: values.prompt,
          color: values.color,
        }
        //  router.push :This line redirects the user to a new route, which includes the newly created image's ID. This is likely used to show the user the transformations or details page of the newly added image. The router object is likely an instance of Next.js's useRouter hook     

            if(action==='Add'){
             try{
              const newImage = await addImage({
                image: imageData,
                userId,
                path: '/'
              })
              if(newImage){
                form.reset()
                setImage(data)
                 router.push(`/transformations/${newImage._id}`)
                 //routing to the existing new image transformation page
              }


             }
             catch(error){
              console.log(error)
             }
            }


            if(action==='Update'){
              try{
               const updatedImage = await updateImage({
                image: {
                  ...imageData,
                  _id: data._id
                },
                userId,
                path: `/transformations/${data._id}`
               })
               if(updatedImage){
                  router.push(`/transformations/${updatedImage._id}`)
                  //routing to the existing image transformation page
               }
              }
              catch(error){
               console.log(error)
              }
             }
          }    
    setIsSubmitting(false)
      }



//for eventtype==fill
      const onSelectFieldHandler = (value: string, onChangeField: (value: string) => void) => {
        const imageSize=aspectRatioOptions[value as AspectRatioKey]
        setImage((prevState :any)=>({
            ...prevState,
            aspectRatio:imageSize.aspectRatio,
            width:imageSize.width,
            height:imageSize.height
        }))

        setNewTransformation(transformationType.config);
        return onChangeField(value);

      }

//render means what should we render on the page on getting the inputs field generally renders the value which recieves  teh input porp or callback



//for event type==remove and recolor
const  onInputChangeHandler =(fieldName:string, value:string,type:string,onChangeField:(value :string)=>void)=>{
    debounce(() => {
        setNewTransformation((prevState: any) => ({
          ...prevState,
          [type]: {
            ...prevState?.[type],
            [fieldName === 'prompt' ? 'prompt' : 'to' ]: value 
          }
        }))
      }, 1000)();
        
      return onChangeField(value)
}



//return to update  
//on clicking the final button
const onTransformHandler = async () => {
  setIsTransforming(true)

  setTransformationConfig(
    deepMergeObjects(newTransformation, transformationConfig)
  )

  setNewTransformation(null)

  startTransition(async () => {
    await updateCredits(userId, creditFee)
  })
}



//use effect for types(restore,removeback),and it only renders only when type,tarnsformation type and image changes

useEffect(() => {
  if(image && (type === 'restore' || type === 'removeBackground')) {
    setNewTransformation(transformationType.config)
  }
}, [image, transformationType.config, type])

//value={field.value} is used to kno wwhether the value of aspect ratio have changed and onselectFiledhandler is used for knowing when the aspect artio has changed line no 240-28 fill option 
//Media Uplaoder is form uploading the image and set the iamge state to the current state
//deepmerge from./li/utils helps u merge keys of 2 images that generally reproduce the new image
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {creditBalance <Math.abs(creditFee)  && <InsufficientCreditsModal/>}
         <CustomField
         control={form.control}
         name="title"
         formLabel="Image Title "
         className="w-full"
         render={ ( { field } )=> <Input {...field} className="input-field" />}
         />



{type == 'fill' && (
  <CustomField
    control={form.control}
    name="aspectRatio"
    formLabel="Aspect Ratio"
    className="w-full"
    render={({ field }) => (
      <Select 
      onValueChange={(value)=>{
        onSelectFieldHandler(value,field.onChange)
        
      }}
      value={field.value}
      >
        <SelectTrigger className="select-field">
          <SelectValue placeholder="Select size" />
        </SelectTrigger>
        <SelectContent>
            {Object.keys(aspectRatioOptions).map((key)=>(
                <SelectItem key={key} value={key} className="select-item">
                  {aspectRatioOptions[key as AspectRatioKey].label}
                </SelectItem>
            ))}

        </SelectContent>
      </Select>
    )}
  />
)}



{(type=='remove'  || type=="recolor" ) && (
    <div className="prompt-field">
        <CustomField
        control={form.control}
        name="prompt"
        formLabel={
            type==="remove" ? 'Object to remove' :"Object to recolor"
        }
        className="w-full"
        render={({field})=>(
            <Input 
                  value={field.value}
                  className="input-field"
                  onChange={(e) => onInputChangeHandler(
                    'prompt',
                    e.target.value,
                    type,
                    field.onChange
                  )}
                />
        )}
        />

    </div>
)}




{type=='recolor' && (
   <CustomField
   control={form.control}
   name="color"
   formLabel="Replacement CoLor"
   className="w-full"
   render={({field})=>(
    <Input 
    value={field.value}
    className="input-field"
    onChange={(e) => onInputChangeHandler(
      'color',
      e.target.value,
      'recolor',
      field.onChange
    )}
  />
   )}
   />
)}

   <div className="media-uploader-field">
          <CustomField 
            control={form.control}
            name="publicId"
            className="flex size-full flex-col"
            render={({ field }) => (
              <MediaUploader 
                onValueChange={field.onChange}
                setImage={setImage}
                publicId={field.value}
                image={image}
                type={type}
              />
            )}
          />
             <TransformedImage 
            image={image}
            type={type}
            title={form.getValues().title}
            isTransforming={isTransforming}
            setIsTransforming={setIsTransforming}
            transformationConfig={transformationConfig}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Button 
            type="button"
            className="submit-button capitalize"
            disabled={isTransforming || newTransformation === null}
            onClick={onTransformHandler}
          >
            {isTransforming ? 'Transforming...' : 'Apply Transformation'}
          </Button>
          <Button 
            type="submit"
            className="submit-button capitalize"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Save Image'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

//mask cloudinaer media uploader within our custom field

export default TransformationForm