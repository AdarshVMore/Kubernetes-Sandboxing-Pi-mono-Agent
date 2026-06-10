import { exec } from "child_process";

export function manipulatePods(command:string) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Standard Error output: ${stderr}`);
      return;
    }
    console.log(`Standard Output:\n${stdout}`);
  });
}
