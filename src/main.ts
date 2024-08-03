#!/usr/bin/env node

import dotenv from "dotenv";
import { Commando } from "./Commando.js";

dotenv.config();

const commando = new Commando();
void commando.run();
