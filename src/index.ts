import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Principal, Server, nat, StableBTreeMap, ic, nat16, nat64, Opt } from 'azle';

enum Gender {
  Female = "female",
  Male = "male"
}

enum HealthStatus {
  Healthy = "healthy",
  Sick = "sick"
}

class FarmAnimal {
  nameOrTagId: string;
  gender: Gender;
  age: nat16;
  healthStat: HealthStatus;
  specy: string;
  breed: string;
  addedBy: Principal;
  submittedAt: nat64;
  updatedAt: Opt<nat64>;
}

class RootineRecord {
  id: string;
  animalTagOrName: string;
  observationsNote: string;
  animalWeight: nat;
  expense: nat;
  observationMadeBy: Principal;
  expenseNote: string;
  submittedAt: nat64;
  updatedAt: Opt<nat64>;
}

class HealthRecord {
  id: string;
  veterinarianName: string;
  diagnosis: string;
  veterinarianRecommendations: string;
  detailsAddedBy: Principal;
  expense: nat;
  expenseNote: string;
  submittedAt: nat64;
  updatedAt: Opt<nat64>;
}

class StaffsAuthority {
  id: Principal;
  name: string;
  hasWritePermission: boolean;
  submittedAt: nat64;
  updatedAt: Opt<nat64>
}

const OWNER_STORAGE_TEXT: string = "FARM_OWNER";
const farmAnimals = StableBTreeMap<string, FarmAnimal>(0);
const staffs = StableBTreeMap<string, StaffsAuthority>(1);
const dailyRootineRecord = StableBTreeMap<string, RootineRecord>(2);
const healthRecord = StableBTreeMap<string, HealthRecord>(2);
const owner = StableBTreeMap<string, Principal>(3);

export default Server(() => {
  const app = express();
  app.use(express.json());

  // Setup endpoint
  app.post("/setup", (req, res) => {
    owner.insert(OWNER_STORAGE_TEXT, ic.caller());
    return res.status(200).send("Farm set up");
  });

  // Add staff endpoint
  app.post("/addstaff", (req, res) => {
    if (!isOwner()) {
      return res.status(404).send("You are not authorised to perform this action");
    }

    const confirm = validateParameters(StaffsAuthority, req.body as any, ["submittedAt", "updatedAt"]);
    if (confirm !== "") return res.status(400).send(`${confirm}`);

    staffs.insert(req.body.id.toString(), { submittedAt: getCurrentDate(), ...req.body });
    return res.status(200).send("Staff added successfully!");
  });

  // Add animal endpoint
  app.post("/addanimal", (req, res) => {
    if (!isAuthorized()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    const confirm = validateParameters(FarmAnimal, req.body, ["submittedAt", "updatedAt"]);
    if (confirm !== "") return res.status(400).send(`${confirm}`);

    const animal: FarmAnimal = { submittedAt: getCurrentDate(), ...req.body };
    farmAnimals.insert(animal.nameOrTagId, animal);
    return res.status(200).json(animal);
  });

  // Add rootine record endpoint
  app.post("/addrootinerecord", (req, res) => {
    if (!isAuthorized()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    const confirm = validateParameters(RootineRecord, req.body, ["submittedAt", "updatedAt", "id"]);
    if (confirm !== "") return res.status(400).send(`${confirm}`);

    const id = uuidv4();
    const rootineRec: RootineRecord = { id, submittedAt: getCurrentDate(), ...req.body };
    dailyRootineRecord.insert(id, rootineRec);
    return res.status(200).json(rootineRec);
  });

  // Add health record endpoint
  app.post("/addhealthrecord", (req, res) => {
    if (!isAuthorized()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    const confirm = validateParameters(HealthRecord, req.body, ["submittedAt", "updatedAt", "id"]);
    if (confirm !== "") return res.status(400).send(`${confirm}`);

    const id = uuidv4();
    const healthRec: HealthRecord = { id, submittedAt: getCurrentDate(), ...req.body };
    healthRecord.insert(id, healthRec);
    return res.status(200).json(healthRec);
  });

  // Transfer ownership endpoint
  app.put("/transferowner", (req, res) => {
    if (!isOwner()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    owner.insert(OWNER_STORAGE_TEXT, req.body.newowner);
    return res.status(200).send(`Owner updated to ${req.body.newowner.toString()}`);
  });

  // Update staff endpoint
  app.put("/updatestaff", (req, res) => {
    if (!isOwner()) {
      return res.status(401).send("You are not authorised to perform this action");
    }

    const id = req.body.id.toString();
    const gottenStaff = staffs.get(id);

    if ("None" in gottenStaff) {
      return res.status(404).send(`Staff with id ${id} not found`);
    }

    const newStaffObj: StaffsAuthority = { ...gottenStaff.Some, ...req.body };
    staffs.insert(id, newStaffObj);
    return res.status(200).json(newStaffObj);
  });

  // Update animal endpoint
  app.put("/updateanimal", (req, res) => {
    if (!isAuthorized()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    const id = req.body.nameOrTagId;
    const gottenAnimalDetail = farmAnimals.get(id);

    if ("None" in gottenAnimalDetail) {
      return res.status(404).send(`Cannot find animal with name or tag id ${id}`);
    }

    const updatedAnimalDetail: FarmAnimal = { ...gottenAnimalDetail.Some, ...req.body };
    farmAnimals.insert(id, updatedAnimalDetail);
    return res.status(200).json(updatedAnimalDetail);
  });

  // Update rootine record endpoint
  app.put("/updaterootine", (req, res) => {
    if (!isAuthorized()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    const id = req.body.id;
    const gottenRootineRecord = dailyRootineRecord.get(id);

    if ("None" in gottenRootineRecord) {
      return res.status(404).send(`Cannot find rootine record with id ${id}`);
    }

    const updatedRootineRecord: RootineRecord = { ...gottenRootineRecord.Some, ...req.body };
    dailyRootineRecord.insert(id, updatedRootineRecord);
    return res.status(200).send(updatedRootineRecord);
  });

  // Update health record endpoint
  app.put("/updateanimalhealthrecord", (req, res) => {
    if (!isAuthorized()) {
      return res.status(400).send("You are not authorized to perform this action");
    }

    const id = req.body.id;
    const gottenHealthRecord = healthRecord.get(id);

    if ("None" in gottenHealthRecord) {
      return res.status(404).send(`Cannot find health record with id ${id}`);
    }

    const newHealthRecord: HealthRecord = { ...gottenHealthRecord.Some, ...req.body };
    healthRecord.insert(id, newHealthRecord);
    return res.status(200).json(newHealthRecord);
  });

  // Get all farm animals endpoint
  app.get("/animals", (req, res) => {
    res.status(200).json(farmAnimals.values());
  });

  // Get a farm animal endpoint
  app.get("/animal/:id", (req, res) => {
    const id = req.params.id;
    const farmAnimal = farmAnimals.get(id);

    if ("None" in farmAnimal) {
      res.status(404).send(`Farm animal with id=${id} not found`);
    } else {
      res.json(farmAnimal.Some);
    }
  });

  // Get all staffs endpoint
  app.get("/staffs", (req, res) => {
    res.status(200).json(staffs.values());
  });

  // Get a staff endpoint
  app.get("/staff/:id", (req, res) => {
    const id = req.params.id;
    const staff = staffs.get(id);

    if ("None" in staff) {
      res.status(404).send(`Staff with id=${id} not found`);
    } else {
      res.json(staff.Some);
    }
  });

  // Get all daily rootine records endpoint
  app.get("/rootine", (req, res) => {
    res.status(200).json(dailyRootineRecord.values());
  });

  // Get a daily rootine record endpoint
  app.get("/rootine/:id", (req, res) => {
    const id = req.params.id;
    const dailyRootine = dailyRootineRecord.get(id);

    if ("None" in dailyRootine) {
      res.status(404).send(`Daily rootine with id=${id} not found`);
    } else {
      res.json(dailyRootine.Some);
    }
  });

  // Get all health records endpoint
  app.get("/healthrecord", (req, res) => {
    res.status(200).json(healthRecord.values());
  });

  // Get a health record endpoint
  app.get("/healthrecord/:id", (req, res) => {
    const id = req.params.id;
    const healthRec = healthRecord.get(id);

    if ("None" in healthRec) {
      res.status(404).send(`Health record with id=${id} not found`);
    } else {
      res.json(healthRec.Some);
    }
  });

  // Get owner endpoint
  app.get("/owner", (req, res) => {
    return res.status(200).json(owner.values());
  });

  // Get total health expenses endpoint
  app.get("/totalhealthexpenses", (req, res) => {
    const total = healthRecord.values().reduce((prev: any, curr: any) => {
      return curr.expense + prev;
    }, 0);
    return res.status(200).send(total.toString());
  });

  // Get total rootine expenses endpoint
  app.get("/totalrootineexpense", (req, res) => {
    const total = dailyRootineRecord.values().reduce((prev: any, curr: any) => {
      return curr.expense + prev;
    }, 0);
    return res.status(200).send(total.toString());
  });

  // Remove a staff endpoint
  app.delete("/staff/:id", (req, res) => {
    if (!isOwner()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    const staffId = req.params.id;
    const staff = staffs.remove(staffId);

    if ("None" in staff) {
      res.status(400).send(`Couldn't remove staff with id=${staffId}. Staff not found`);
    } else {
      res.json(staff.Some);
    }
  });

  // Remove a farm animal endpoint
  app.delete("/animal/:id", (req, res) => {
    if (!isOwner()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    const animalId = req.params.id;
    const animal = staffs.remove(animalId);

    if ("None" in animal) {
      res.status(400).send(`Couldn't remove animal with id=${animalId}. Animal record not found`);
    } else {
      res.json(animal.Some);
    }
  });

  // Remove a daily rootine record endpoint
  app.delete("/dailyrootine/:id", (req, res) => {
    if (!isOwner()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    const rootineId = req.params.id;
    const dailyRootine = dailyRootineRecord.remove(rootineId);

    if ("None" in dailyRootine) {
      res.status(400).send(`Couldn't remove rootine with id=${rootineId}. Rootine record not found`);
    } else {
      res.json(dailyRootine.Some);
    }
  });

  // Remove a health record endpoint
  app.delete("/healthrecord/:id", (req, res) => {
    if (!isOwner()) {
      return res.status(401).send("You are not authorized to perform this action");
    }

    const healthRecordId = req.params.id;
    const healthRec = healthRecord.remove(healthRecordId);

    if ("None" in healthRec) {
      res.status(400).send(`Couldn't remove health record with id=${healthRecordId}. Health record not found`);
    } else {
      res.json(healthRec.Some);
    }
  });

  return app.listen();
});

// Function to check if the caller is the owner of the farm
function isOwner(): boolean {
  return owner.get(OWNER_STORAGE_TEXT) === ic.caller();
}

// Function to check if the caller is a farm staff with write permission
function isAuthorized(): boolean {
  const callerId = ic.caller();
  return isOwner() || staffs.values().some((staff) => staff.id === callerId && staff.hasWritePermission);
}

// Function to enforce the parameters being passed in a post request
function validateParameters(comparedClass: any, parsedData: {}, exceptions: string[] = []): string {
  // Convert the class to an object
  const objFromClass = JSON.parse(JSON.stringify(comparedClass));
  // Get the keys in the parsed object by the user
  const parsedDataKeys = Object.keys(parsedData);
  // Get all the absent parameters into an array, considering the exceptions
  const absentParams = Object.keys(objFromClass).reduce((prev: string[], curr: string) => {
    if (!exceptions.includes(curr) && !parsedDataKeys.includes(curr)) {
      return [...prev, curr];
    }
    return prev;
  }, []);

  if (absentParams.length > 0) {
    const formattedString = concatenateWithAnd(absentParams);
    return `${formattedString} must be present`;
  }

  return "";
}

// Function to concatenate strings with "and"
function concatenateWithAnd(array: string[]) {
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

// Function to get the current date
function getCurrentDate() {
  const timestamp = new Number(ic.time());
  return new Date(timestamp.valueOf() / 1000_000);
}
