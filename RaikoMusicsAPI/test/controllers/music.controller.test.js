// const fs = require('fs').promises;  // No longer needed
const fs = require("fs/promises");

jest.mock("fs/promises");
const musicController = require("../../src/controllers/music.controller");

describe("Music Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should get a empty list of music and return a 200 status", async () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    fs.readdir.mockResolvedValue([]);

    await musicController.getMusicList(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });

  it("should process valid folders and gracefully handle broken ones", async () => {
    const mockFolders = ["folder-1-valid", "folder-2-broken"];
    const mockMetadata = { title: "Lunatic Eyes", artist: "Zun" };

    fs.readdir.mockResolvedValue(mockFolders);
    fs.readFile.mockImplementation((filePath) => {
      if (filePath.includes("folder-1-valid")) {
        return Promise.resolve(JSON.stringify(mockMetadata));
      } else {
        return Promise.reject(new Error("File is unreadable"));
      }
    });

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await musicController.getMusicList(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          id: "folder-1-valid",
          title: "Lunatic Eyes",
          artist: "Zun",
        },
      ],
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should catch error and go next", async () => {
    const mockError = new Error("Client system error");

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    fs.readdir.mockRejectedValue(mockError);

    await musicController.getMusicList(req, res, next);

    expect(next).toHaveBeenCalledWith(mockError);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("should upload a song and return a 201 status", async () => {
    const req = {
      body: {
        title: "Test Title",
        artist: "Test Artist",
      },
      files: {
        song: [
          {
            path: "/fake/path/song.mp3",
            filename: "fakesong.mp3",
          },
        ],
        cover: [
          {
            path: "/fake/path/cover.jpg",
            filename: "fakecover.jpg",
          },
        ],
      },
      albumPath: "/fake/album/path",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    fs.writeFile.mockResolvedValue();

    await musicController.uploadMusic(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Song uploaded successfully",
      data: {
        title: "Test Title",
        artist: "Test Artist",
        songFile: "fakesong.mp3",
        coverFile: "fakecover.jpg",
      },
    });
  });

  it("should refuse and return a 400 status because title is missing and albumpath does not exist", async () => {
    const req = {
      body: {
        artist: "Test Artist",
      },
      files: {
        song: [
          {
            path: "/fake/path/song.mp3",
            filename: "fakesong.mp3",
          },
        ],
        cover: [
          {
            path: "/fake/path/cover.jpg",
            filename: "fakecover.jpg",
          },
        ],
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await musicController.uploadMusic(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Title and artist are required.",
    });
    expect(fs.rm).not.toHaveBeenCalled();
  });
  it("should remove albumPath if it exist but title is missing", async () => {
    const req = {
      body: {
        artist: "Test Artist",
        albumPath: "random/path",
      },
      files: {
        song: [
          {
            path: "/fake/path/song.mp3",
            filename: "fakesong.mp3",
          },
        ],
        cover: [
          {
            path: "/fake/path/cover.jpg",
            filename: "fakecover.jpg",
          },
        ],
      },
      albumPath: "/fake/album/path",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    fs.rm.mockResolvedValue(undefined);
    await musicController.uploadMusic(req, res, next);
    expect(fs.rm).toHaveBeenCalledWith(req.albumPath, {
      recursive: true,
      force: true,
    });
  });

  it("should refuse and return a 400 status without using fs.rm because files are missing", async () => {
    const req = {
      body: {
        title: "Test Title",
        artist: "Test Artist",
      },
      files: {
        cover: [{}],
      },
      albumPath: "/fake/album/path",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    await musicController.uploadMusic(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Both a song and a cover image are required.",
    });
  });
  it("should refuse and return a 400 status & not use fs.rm because albumPath isn't in the request ", async () => {
    const req = {
      body: {
        title: "Test Title",
        artist: "Test Artist",
      },
      files: {
        cover: [{}],
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await musicController.uploadMusic(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Both a song and a cover image are required.",
    });
    expect(fs.rm).not.toHaveBeenCalled();
  });

  it("should catch error, go next if writeFile fails", async () => {
    const mockError = new Error("File system error");
    const req = {
      body: {
        title: "Test Title",
        artist: "Test Artist",
      },
      files: {
        song: [{ filename: "fakesong.mp3" }],
        cover: [{ filename: "fakecover.jpg" }],
      },
      albumPath: "/fake/album/path",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    fs.writeFile.mockRejectedValue(mockError);

    await musicController.uploadMusic(req, res, next);

    expect(next).toHaveBeenCalledWith(mockError);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  it("should delete a song and return a 200 status", async () => {
    const req = {
      params: {
        id: "randomID",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    fs.readFile.mockResolvedValue(JSON.stringify({ title: "Test Song" }));
    fs.rm.mockResolvedValue();
    await musicController.deleteMusicById(req, res, next);
    expect(fs.readFile).toHaveBeenCalledTimes(1);
    expect(fs.rm).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: `The song "Test Song" has been deleted`,
    });
    expect(next).not.toHaveBeenCalled();
  });
  it("should return 400 because id is missing", async () => {
    const req = {
      params: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await musicController.deleteMusicById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: `id is required.`,
    });
    expect(next).not.toHaveBeenCalled();
  });
  it("should return 404 because id doesn't exist", async () => {
    const req = {
      params: { id: "nonexistantID" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    fs.readFile.mockRejectedValue(new Error("ENOENT"));

    await musicController.deleteMusicById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: `music doesn\'t exist`,
    });
  });
  it("should call next(e) when an unexpected error occurs in the outer catch", async () => {
    const req = {
      params: { id: "randomID" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    fs.readFile.mockResolvedValue(JSON.stringify({ title: "Test Song" }));
    fs.rm.mockResolvedValue();

    const consoleError = new Error("Unexpected failure");
    jest.spyOn(console, "log").mockImplementation(() => {
      throw consoleError;
    });

    await musicController.deleteMusicById(req, res, next);

    expect(next).toHaveBeenCalledWith(consoleError);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    console.log.mockRestore();
  });
});
