# ImageTournament
Coming soon...
Image Tournament is an application that helps you to sort your photos by comparing them side by side and asking you to choose which one is better. Each tournament will happen within one of your photo albums.

## Design
### User Interface
The user opens the desktop application to a page showing folders of pictures. There should be an All Photos folder and the ability to create additional folders. The top bar should have a button to add a new folder and a button to upload images. If the user is in the home page or All Photos album then the images will only be added to All Photos, but if the user is in another album while uploading pictures then those pictures will be added to that album as well as All Photos.

When the user double clicks on an album, the new folder button on the top bar will go away since there cannot be subfolders inside of a folder. There will be a new button Sort Pictures. Sort Pictures will begin a tournament style mode where two pictures are shown side by side and the user votes on which picture is better. The user can double click on a picture's thumbnail in order to show it larger on screen along with metadata about the photo and the ability to use left/right arrow keys to navigate through photos. It should give the user the option to add the picture to other folders when viewing the photo in the double click view. Right clicking the photo thumbnail within an album should give the ability to add it to another album as well.


### Backend
There should be a database containing all images with a schema (name, timestamp, thumbnail, [additional metadata])
There should be a database containing all folders with a schema like (name, images, created_on).
There should be a database for storing image comparisons with schema like (image1, image2, winner). This data will initially not be leveraged, but could become valuable in future versions.

#### Sorting algorithm options:
- My favorite: The algorithm for sorting images will be a binary search against currently sorted images, so each sort will take log base 2 of n votes where n is the number of sorted images. The user can potentially say that they want only the top x images which will make each operation only log base 2 of a smaller fixed number as opposed to 1000+ images which would take 10 votes per insertion, which gets to be time consuming for the user.
- ELO: Could be faster than binary insert, however won't be as clear to user when process is complete. Should be analyzed to see if it's more viable for large photo sets.
- Round robin: Most likely going to be too many comparisons, however should be analyzed.

#### Additional "Tinder" style algorithm:
Users might want to decide whether or not an image is even worthy of entering the tournament, and since it takes a lot of votes to insert into a sorted list, we might want to discard some ahead of time. Initially this flow be done by the user by removing bad photos from the folder before starting the tournament, however eventually a "Tinder Mode" button might come along in order to further classify images within folders.


## Notes:
- A users votes on an image in one folder should not impact how that same image is sorted in other folders.
- The program should only be for images, not videos or other types of files.
- The application should not delete user's photos and that should be obvious by the user interface.