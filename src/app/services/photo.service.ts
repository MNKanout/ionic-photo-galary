import { Injectable } from '@angular/core';
import {Camera, CameraResultType, CameraSource, Photo} from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})

export class PhotoService {

  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';

  constructor() { }


  public async addNewToGallery(){
    // Take a photo
    const capturePhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    // Save the picture and add it to photo collection
    const savedImageFile = await this.savePicture(capturePhoto);
    this.photos.unshift(savedImageFile);

    this.photos.unshift({
      filePath: "soon...",
      webViewPath: capturePhoto.webPath!
    });

    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  };

  private async savePicture(photo: Photo) {
    const base64Data = await this.readAsBase64(photo);

    // Write the file to the data directory
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    return {
      filePath: fileName,
      webview: photo.webPath
    }
  };

  private async readAsBase64(photo: Photo) {
    // Fetch the photo, read as a blob, then convert to base64 format
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();

    return await this.convertBlobToBase64(blob) as string;
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  public async loadSaved(){
    const {value} = await Preferences.get({key: this.PHOTO_STORAGE});
    this.photos = (value ? JSON.parse(value):[]) as UserPhoto[];

    // Display the photo by reading into base64 format
    for (let photo of this.photos){
      // Read each saved photo's data from the Filesystem
      const readFile = await Filesystem.readFile({
        path: photo.filePath,
        directory: Directory.Data
      });

      // Web platfrom only: Load the photo as base64 data
      photo.webViewPath = `data:image/jpeg;base64,${readFile.data}`
    }
  };

}


export interface UserPhoto{
  filePath: string,
  webViewPath?: string
};
