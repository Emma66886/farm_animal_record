import { v4 as uuidv4 } from 'uuid';
import { Principal, Server, nat,StableBTreeMap, ic,nat16,nat64,Opt } from 'azle';
import express from 'express';

//This represent posible gender option
enum Gender{
  Female="female",
  Male="male"
}

//Options for animal health status
enum HealthStatus{
   Healthy="healthy",
   Sick="sick"
}
/**
 This type represents the farm animal object.
 */
class FarmAnimal {
  name_or_tagid:string;
  gender:Gender;
  age:nat16;
   health_stat:HealthStatus;
   specy:string;
   breed:string;
   addedby:Principal;
   submittedAt: nat64;
  updatedAt: Opt<nat64>;
}

// This type represents animal Daily rooting checks of the animal
class RootineRecord{
   id:string;
   animal_tag_or_name:string;
   observations_note:string;
   animal_weigth:nat;
   expense:nat;
   observation_made_by:Principal;
   expense_note:string;
   submittedAt: nat64;
  updatedAt: Opt<nat64>;
}

// This type represents animal health issues and record
class HealthRecord{
   id:string;
   veterinarian_name:string;
   diagnosis:string;
   veterinarian_recomendations:string;
   details_added_by:Principal;
   expense:nat;
   expense_note:string;
   submittedAt: nat64;
  updatedAt: Opt<nat64>;
}

// This type represents staffs records
class StaffsAuthority{
   id:Principal;
   name:string;
   has_write_permission:boolean;
   submittedAt:nat64;
   updatedAt: Opt<nat64>
}

const OWNER_STORAGE_TEXT:string = "OWNER"
// Storage map for the farm animals details
const farmAnimals = StableBTreeMap<string, FarmAnimal>(0);
const staffs = StableBTreeMap<string, StaffsAuthority>(1);
const dailyRootineRecord = StableBTreeMap<string,RootineRecord>(2)
const healthrecord = StableBTreeMap<string,HealthRecord>(2)
const owner = StableBTreeMap<string, Principal>(3);

export default Server(() => {
   const app = express();
   app.use(express.json());

   app.post("/setup",(req,res)=>{
      owner.insert(OWNER_STORAGE_TEXT,ic.caller());
      return res.status(200).send("Farm set up")
   });

  

   app.post("/addstaff",(req,res)=>{
      if(!isOwner()){
         return res.status(404).send("You are not authorised to perform this action")
      }
      const confirm = confirm_parameters(StaffsAuthority,req.body as any,["submittedAt","updatedAt"]);
      if(confirm != "") return res.status(400).send(`${confirm}`);
      staffs.insert(req.body.id.toString(),{submittedAt:getCurrentDate(),...req.body});
      return res.status(200).send("Staff added successfully!")
   })

   //Add a new animal
   app.post("/addanimal", (req, res) => {
      if(!isAuthorized()){
         return res.status(401).send("You are not authorized to perform this action");
      }
      const confirm = confirm_parameters(FarmAnimal,req.body,["submittedAt","updatedAt"]);
      if(confirm != "") return res.status(400).send(`${confirm}`);
      const animal: FarmAnimal =  { submittedAt: getCurrentDate(), ...req.body};
      farmAnimals.insert(animal.name_or_tagid,animal);
      res.status(200).json(animal);
   });

   //Add new rootine record
   app.post("/addrootinerecord",(req,res)=>{
      if(!isAuthorized()){
         return res.status(401).send("You are not authorized to perform this action");
      }
      const confirm = confirm_parameters(RootineRecord,req.body,["submittedAt","updatedAt","id"]);
      if(confirm != "") return res.status(400).send(`${confirm}`);
      const id = uuidv4()
      const rootineRec: RootineRecord =  {id ,submittedAt: getCurrentDate(), ...req.body};
      dailyRootineRecord.insert(id,rootineRec);
      res.status(200).json(rootineRec);
   })

   //Add a new health record to an animal
   app.post("/addhealthrecord",(req,res)=>{
      if(!isAuthorized()){
         return res.status(401).send("You are not authorized to perform this action");
      }
      const confirm = confirm_parameters(HealthRecord,req.body,["submittedAt","updatedAt","id"]);
      if(confirm != "") return res.status(400).send(`${confirm}`);
      const id=uuidv4()
      const healthRec: HealthRecord =  {id ,submittedAt: getCurrentDate(), ...req.body};
      healthrecord.insert(id,healthRec);
      res.status(200).json(healthRec);
   })

   //End point to transfer owner ship of the farm grand authority
   app.put("/transferowner",(req,res)=>{
      if(!isOwner()){
         return res.status(401).send("You are not authorized to perform this action")
      }
      owner.insert(OWNER_STORAGE_TEXT,req.body.newowner);
      return res.status(200).send(`owner updated to ${req.body.newowner.toString()}`);
   })
   //endpoint to update a staff
   app.put("/updatestaff",(req,res)=>{
      if(!isOwner()){
         return res.status(401).send("You are not authorised to perform this action")
      }
      const id = req.body.id.toString();
      const gottenStaff = staffs.get(id)
      if("None" in gottenStaff){
         return res.status(404).send(`Staff with id ${id} not found`)
      }
      const newStaffObj:StaffsAuthority = {...gottenStaff.Some,...req.body} 
      staffs.insert(id,newStaffObj);
      return res.status(200).json(newStaffObj);
   })

   // Update an animal info
   app.put("/updateanimal",(req,res)=>{
      if(!isAuthorized()){
         return res.status(401).send("You are not authorized to perform this action");
      }
      const id = req.body.name_or_tagid;
      const gottenAnimaldetail = farmAnimals.get(id);
      if("None" in gottenAnimaldetail){
         return res.status(404).send(`Cannot find animal with name or tag id ${id}`)
      }
      const updatedAnimalDetail:FarmAnimal = {...gottenAnimaldetail.Some,...req.body} ;
      farmAnimals.insert(id,updatedAnimalDetail)
      return res.status(200).json(updatedAnimalDetail)
   })

   //Update an animal rootine record
   app.put("/updaterootine",(req,res)=>{
      if(!isAuthorized()){
         return res.status(401).send("You are not authorized to perform this action")
      }
      const id = req.body.id;
      const gottenRootineRecord = dailyRootineRecord.get(id);
      if("None" in gottenRootineRecord){
         return res.status(404).send(`Cannot find rootine record with id ${id}`)
      }
      const updatedRootineRecord:RootineRecord = {...gottenRootineRecord.Some,...req.body}
     dailyRootineRecord.insert(id,updatedRootineRecord);
      return res.status(200).send(updatedRootineRecord);
   })

   //Update a health record for an animal
   app.put("/updateanimalhealthrecord",(req,res)=>{
      if(!isAuthorized()){
         return res.status(400).send("You are not authorized to perform this action");
      }
      const id = req.body.id;
      const gottenhealthrecord = healthrecord.get(id);
      if("None" in gottenhealthrecord){
         return res.status(404).send(`Cannot find health record with id ${id}`);
      }
      const newHealthRecord:HealthRecord = {...gottenhealthrecord.Some,...req.body};
      healthrecord.insert(id,newHealthRecord);
      return res.status(200).json(newHealthRecord);
   })

   //Get all the farm animals
   app.get("/animals", (req, res) => {
      res.status(200).json(farmAnimals.values());
   });

   //Get a farm aniamal
   app.get("/animal/:id", (req, res) => {
      const id = req.params.id;
      const farmanimal = farmAnimals.get(id)
      if ("None" in farmanimal) {
         res.status(404).send(`farm animal with id=${id} not found`);
      } else {
         res.json(farmanimal.Some);
      }
   });

   //Get all staffs
   app.get("/staffs", (req, res) => {
      res.status(200).json(staffs.values());
   });

   //Get a staff
   app.get("/staff/:id", (req, res) => {
      const id = req.params.id;
      const staff = staffs.get(id)
      if ("None" in staff) {
         res.status(404).send(`Staff with id=${id} not found`);
      } else {
         res.json(staff.Some);
      }
   });

   //Get all daily rootine record staff
   app.get("/rootine", (req, res) => {
      res.status(200).json(dailyRootineRecord.values());
   });
   //Get a daily rootine record
   app.get("/rootine/:id", (req, res) => {
      const id = req.params.id;
      const dailyrootine = dailyRootineRecord.get(id)
      if ("None" in dailyrootine) {
         res.status(404).send(`Dailyrootine with id=${id} not found`);
      } else {
         res.json(dailyrootine.Some);
      }
   });

   //Get all health record
   app.get("/healthrecord", (req, res) => {
      res.status(200).json(healthrecord.values());
   });
   //Get a health record
   app.get("/healthrecord/:id",(req,res)=>{
      const id = req.params.id;
      const healthrec = healthrecord.get(id)
      if ("None" in healthrec) {
         res.status(404).send(`Healthrecord with id=${id} not found`);
      } else {
         res.json(healthrec.Some);
      }
   })

   //Get owner
   app.get("/owner",(req,res)=>{
      return res.status(200).json(owner.values())
   })

   //Get all expenses total on health
   app.get("/totalhealthexpenses",(req,res)=>{
      const total = healthrecord.values().reduce((prev:any,curr:any)=>{
         return curr.expense + prev;
      },0)
      return res.status(200).send(total.toString());
   })

   //Get all expenses on rootine
   app.get("/totalrootineexpense",(req,res)=>{
      const total = dailyRootineRecord.values().reduce((prev:any,curr:any)=>{
         return curr.expense + prev;
      },0)
      return res.status(200).send(total.toString());
   })
   //Remove a staff
   app.delete("/staff/:id", (req, res) => {
      if(!isOwner()){
         return res.status(401).send("You are not authorized to perform this action");
      }
      const staffid = req.params.id;
      const staff = staffs.remove(staffid);
      if ("None" in staff) {
         res.status(400).send(`couldn't remove staff with id=${staffid}. staff not found`);
      } else {
         res.json(staff.Some);
      }
   });

   //Remove a farmAnimal
   app.delete("/animal/:id", (req, res) => {
      if(!isOwner()){
         return res.status(401).send("You are not authorized to perform this action");
      }
      const animalid = req.params.id;
      const animal = staffs.remove(animalid);
      if ("None" in animal) {
         res.status(400).send(`couldn't remove animal with id=${animalid}. animal record not found`);
      } else {
         res.json(animal.Some);
      }
   });

   //Remove a daily rootine record
   app.delete("/dailyrootine/:id", (req, res) => {
      if(!isOwner()){
         return res.status(401).send("You are not authorized to perform this action");
      }
      const rootineid = req.params.id;
      const dailyrootine = dailyRootineRecord.remove(rootineid);
      if ("None" in dailyrootine) {
         res.status(400).send(`couldn't remove Rootine with id=${rootineid}. Rootine record not found`);
      } else {
         res.json(dailyrootine.Some);
      }
   });

   //Remove a health record
   app.delete("/healthrecord/:id", (req, res) => {
      if(!isOwner()){
         return res.status(401).send("You are not authorized to perform this action");
      }
      const healthrecordid = req.params.id;
      const healthrec = healthrecord.remove(healthrecordid);
      if ("None" in healthrec) {
         res.status(400).send(`couldn't remove Health record with id=${healthrecordid}. Health record not found`);
      } else {
         res.json(healthrec.Some);
      }
   });

   return app.listen();
});

// Check if the caller is the owner of the farm
function isOwner():boolean{
   return owner.get(OWNER_STORAGE_TEXT) === ic.caller();
}
//Check if the caller is farm staff and have access to the write 
function isAuthorized():boolean{
   return isOwner() || staffs.values().filter((val)=>(val.id === ic.caller() && val.has_write_permission)).length > 0;
}
// Function that enforcess the parameters being passed in a post request
function confirm_parameters(compared_class:any,parsedData:{},exceptions:string[]=[]):string{
 //  converting the class to an object
   const obj_from_class = JSON.parse(JSON.stringify(compared_class));
   // getting the keys in the parsed object by the user
   const parsed_data_keys = Object.keys(parsedData)
   // Getting all the absent parameters in to an array taking in to considerations the exceptions which can be hardcoded or null
   const absent_params = Object.keys(obj_from_class).reduce((prev:string[],curr:string)=>{
      if(!exceptions.includes(curr)){
         if(!parsed_data_keys.includes(curr)) return [...prev,curr];
      }
      return prev;
   },[]);
   if(absent_params.length > 0 ){
      const formatedString = concatenateWithAnd(absent_params);
      return `${formatedString} must be present`
   }
   return ""
}

// Function to add and to the last string item in the array

function concatenateWithAnd(array:string[]) {
   if (array.length === 0) {
       return "";
   } else if (array.length === 1) {
       return array[0];
   } else if (array.length === 2) {
       return array.join(" and ");
   } else {
       const lastElement = array.pop();
       return array.join(", ") + ", and " + lastElement;
   }
}

function getCurrentDate() {
   const timestamp = new Number(ic.time());
   return new Date(timestamp.valueOf() / 1000_000);
}