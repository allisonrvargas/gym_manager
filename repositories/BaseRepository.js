export class BaseRepository {
  constructor(db, nombreColeccion) {
    this.collection = db.collection(nombreColeccion);
  }

  findById(id, session) {
    return this.collection.findOne({ _id: id }, { session });
  }

  findOne(filtro, session) {
    return this.collection.findOne(filtro, { session });
  }

  find(filtro = {}, { sort, limit, session } = {}) {
    let cursor = this.collection.find(filtro, { session });
    if (sort) cursor = cursor.sort(sort);
    if (limit) cursor = cursor.limit(limit);
    return cursor.toArray();
  }

  async insert(doc, session) {
    const { insertedId } = await this.collection.insertOne(doc, { session });
    return { ...doc, _id: insertedId };
  }

  updateById(id, update, session) {
    return this.collection.updateOne({ _id: id }, update, { session });
  }

  updateOne(filtro, update, session) {
    return this.collection.updateOne(filtro, update, { session });
  }

  updateMany(filtro, update, session) {
    return this.collection.updateMany(filtro, update, { session });
  }

  deleteById(id, session) {
    return this.collection.deleteOne({ _id: id }, { session });
  }

  deleteMany(filtro, session) {
    return this.collection.deleteMany(filtro, { session });
  }

  count(filtro = {}, session) {
    return this.collection.countDocuments(filtro, { session });
  }

  aggregate(pipeline, session) {
    return this.collection.aggregate(pipeline, { session }).toArray();
  }
}
